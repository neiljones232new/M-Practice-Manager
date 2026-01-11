import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import * as path from 'path';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { TasksService } from '../tasks/tasks.service';
import { ServicesService } from '../services/services.service';
import { ComplianceService } from '../filings/compliance.service';
import { QueryTemplatesService, QueryTemplate, QuickAction } from './query-templates.service';

export interface AssistContext {
  clientRef?: string;
  portfolioCode?: number;
  userId?: string;
  includeClients?: boolean;
  includeTasks?: boolean;
  includeServices?: boolean;
  includeCompliance?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CachedResponse {
  query: string;
  response: string;
  context: AssistContext;
  timestamp: Date;
  expiresAt: Date;
}

// NEW: Chat message shape for chat-style endpoint
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class AssistService {
  private readonly logger = new Logger(AssistService.name);
  private openai: OpenAI | null = null;
  private isOnline = false;
  private cachedResponses: Map<string, CachedResponse> = new Map();
  private readonly cacheExpiryHours = 24;
  private readonly defaultModel: string;

  constructor(
    private configService: ConfigService,
    private queryTemplatesService: QueryTemplatesService,
    @Inject(forwardRef(() => FileStorageService))
    private fileStorage: FileStorageService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
    @Inject(forwardRef(() => ServicesService))
    private servicesService: ServicesService,
    @Inject(forwardRef(() => ComplianceService))
    private complianceService: ComplianceService,
  ) {
    this.defaultModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4';
    this.initializeOpenAI();
    this.loadCachedResponses(); // fire-and-forget
  }

  private initializeOpenAI() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.isOnline = true;
      this.logger.log(`OpenAI integration initialized (model=${this.defaultModel}) — Online mode`);
    } else {
      this.logger.warn('OpenAI API key not found — running in OFFLINE mode');
      this.isOnline = false;
    }
  }

  /**
   * === NEW ===
   * Multi-turn chat. Accepts messages[] and bridges to OpenAI.
   * Uses buildSystemPrompt(contextData) as the FIRST system message unless
   * the caller already provided one (then both are included, with ours first).
   */
  async processChat(
    messages: ChatMessage[],
    context: AssistContext = {},
    opts?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    // Normalize + guard
    if (!messages || messages.length === 0) {
      return 'No messages provided.';
    }

    // Generate context data for system prompt
    const contextData = await this.generateContextData(context);
    const systemPrompt = this.buildSystemPrompt(contextData);

    // Prepend our system prompt (keep caller-provided system after ours, if present).
    const hasCallerSystem = messages.some(m => m.role === 'system');
    const prepared: ChatMessage[] = hasCallerSystem
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : [{ role: 'system', content: systemPrompt }, ...messages];

    // Build cache key
    const cacheKey = this.generateCacheKey(JSON.stringify(prepared), context);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached chat response');
      return cached.response;
    }

    // OFFLINE fallback
    if (!this.isOnline || !this.openai) {
      const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      const response = await this.getOfflineResponse(lastUser, contextData);
      this.cacheResponse(cacheKey, '[chat]', response, context);
      return response;
    }

    // ONLINE
    try {
      const model = opts?.model || this.defaultModel;
      const max_tokens = opts?.maxTokens ?? 800;
      const temperature = opts?.temperature ?? 0.7;

      const completion = await this.openai.chat.completions.create({
        model,
        messages: prepared,
        max_tokens,
        temperature,
      });

      const response =
        completion.choices?.[0]?.message?.content ??
        'I apologize, but I could not generate a response at this time.';

      this.cacheResponse(cacheKey, '[chat]', response, context);
      return response;
    } catch (err) {
      this.logger.error('OpenAI chat API error:', err);
      const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      const response = await this.getOfflineResponse(lastUser, contextData);
      this.cacheResponse(cacheKey, '[chat/offline]', response, context);
      return response;
    }
  }

  /**
   * Single-turn helper (kept exactly as you had it).
   */
  async processQuery(prompt: string, context: AssistContext = {}): Promise<string> {
    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, context);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached response');
      return cached.response;
    }

    const contextData = await this.generateContextData(context);

    if (!this.isOnline || !this.openai) {
      const response = await this.getOfflineResponse(prompt, contextData);
      this.cacheResponse(cacheKey, prompt, response, context);
      return response;
    }

    try {
      const systemPrompt = this.buildSystemPrompt(contextData);
      const completion = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const response =
        completion.choices[0].message?.content ||
        'I apologize, but I could not generate a response at this time.';

      this.cacheResponse(cacheKey, prompt, response, context);
      return response;
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      const response = await this.getOfflineResponse(prompt, contextData);
      this.cacheResponse(cacheKey, prompt, response, context);
      return response;
    }
  }

  // --- High-level helpers (unchanged from your version) ---

  async getClientSummary(clientRef: string): Promise<string> {
    const context: AssistContext = {
      clientRef,
      includeClients: true,
      includeServices: true,
      includeTasks: true,
      includeCompliance: true,
    };
    const prompt = `Provide a comprehensive summary of client ${clientRef} including their services, recent tasks, compliance status, and any recommendations.`;
    return this.processQuery(prompt, context);
  }

  async checkDeadlines(daysAhead: number = 30): Promise<string> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const context: AssistContext = {
      includeTasks: true,
      includeCompliance: true,
      dateRange: {
        start: new Date(),
        end: endDate,
      },
    };
    const prompt = `Check for upcoming deadlines and overdue items in the next ${daysAhead} days. Prioritize by urgency and provide actionable recommendations.`;
    return this.processQuery(prompt, context);
  }

  async getPriorityTasks(userId?: string): Promise<string> {
    const context: AssistContext = {
      userId,
      includeTasks: true,
      includeCompliance: true,
    };
    const prompt = `Analyze current tasks and provide priority recommendations. Focus on overdue items, high-priority tasks, and upcoming deadlines.`;
    return this.processQuery(prompt, context);
  }

  async getBusinessInsights(portfolioCode?: number): Promise<string> {
    const context: AssistContext = {
      portfolioCode,
      includeClients: true,
      includeServices: true,
      includeTasks: true,
      includeCompliance: true,
    };
    const prompt = `Provide business insights and recommendations based on current client portfolio, service delivery, and practice performance.`;
    return this.processQuery(prompt, context);
  }

  private async generateContextData(context: AssistContext): Promise<any> {
    const contextData: any = {
      timestamp: new Date().toISOString(),
      mode: this.isOnline ? 'online' : 'offline',
    };

    try {
      if (context.includeClients) {
        const filters: any = {};
        if (context.portfolioCode) filters.portfolioCode = context.portfolioCode;

        if (context.clientRef) {
          const client = await this.clientsService.findByRef(context.clientRef);
          contextData.client = client;
        } else {
          const clients = await this.clientsService.findAll(filters);
          contextData.clients = clients.slice(0, 50);
        }
      }

      if (context.includeTasks) {
        const taskFilters: any = {};
        if (context.userId) taskFilters.assignee = context.userId;
        if (context.clientRef) taskFilters.clientRef = context.clientRef;
        if (context.dateRange) taskFilters.dueDateRange = context.dateRange;

        const tasks = await this.tasksService.findAll(taskFilters);
        contextData.tasks = tasks.slice(0, 100);
      }

      if (context.includeServices) {
        const serviceFilters: any = {};
        if (context.clientRef) serviceFilters.clientRef = context.clientRef;

        const services = await this.servicesService.findAll(serviceFilters);
        contextData.services = services.slice(0, 100);
      }

      if (context.includeCompliance) {
        const complianceFilters: any = {};
        if (context.clientRef) complianceFilters.clientRef = context.clientRef;
        if (context.dateRange) complianceFilters.dueDateRange = context.dateRange;

        const compliance = await this.complianceService.findAll(complianceFilters);
        contextData.compliance = compliance.slice(0, 100);
      }
    } catch (error) {
      this.logger.error('Error generating context data:', error);
      contextData.error = 'Some context data could not be loaded';
    }

    return contextData;
  }

  private buildSystemPrompt(contextData: any): string {
    return `
You are MDJ Assist — a professional practice assistant for accounting and tax professionals.
You help with client management, compliance deadlines, task prioritization, and business insights.

CURRENT CONTEXT:
${JSON.stringify(contextData, null, 2)}

GUIDELINES:
- Provide concise, actionable advice
- Focus on practical solutions for professional practice management
- Prioritize urgent items (overdue tasks, approaching deadlines)
- Use specific data from the context when available
- Format responses clearly with bullet points or numbered lists when appropriate
- Always mention specific client references, dates, and amounts when relevant
- If data is limited, acknowledge this and provide general guidance

RESPONSE FORMAT:
- Start with a brief summary
- Provide specific recommendations
- Include next steps or actions
- End with any important warnings or considerations
    `.trim();
  }

  private async getOfflineResponse(prompt: string, contextData?: any): Promise<string> {
    const lowerPrompt = (prompt || '').toLowerCase();

    if (contextData) {
      if (lowerPrompt.includes('client') && lowerPrompt.includes('summary') && contextData.client) {
        const client = contextData.client;
        return `CLIENT SUMMARY (Offline Mode)
        
Client: ${client.name} (${client.ref})
Type: ${client.type}
Status: ${client.status}
Services: ${contextData.services?.length || 0} active services
Tasks: ${contextData.tasks?.length || 0} current tasks
        
For full AI analysis, please configure your OpenAI API key in settings.`;
      }

      if (lowerPrompt.includes('deadline') && contextData.tasks) {
        const overdueTasks =
          contextData.tasks?.filter((t: any) => new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED') || [];

        return `DEADLINE CHECK (Offline Mode)
        
Overdue Tasks: ${overdueTasks.length}
Total Active Tasks: ${contextData.tasks?.length || 0}
        
${overdueTasks
  .slice(0, 5)
  .map((t: any) => `• ${t.title} (Due: ${new Date(t.dueDate).toLocaleDateString()})`)
  .join('\n')}
        
For intelligent prioritization, please configure your OpenAI API key in settings.`;
      }
    }

    if (lowerPrompt.includes('client') && lowerPrompt.includes('summary')) {
      return 'In offline mode: To get client summaries, check the client overview page for key details like services, annual fees, and recent activity.';
    }
    if (lowerPrompt.includes('deadline') || lowerPrompt.includes('due')) {
      return 'In offline mode: Check your dashboard for upcoming deadlines and overdue items. Review the compliance section for filing requirements.';
    }
    if (lowerPrompt.includes('task')) {
      return 'In offline mode: Visit the tasks page to view, create, and manage work items. Use filters to find tasks by client, assignee, or due date.';
    }

    return 'MDJ Assist is currently in offline mode. For full AI assistance, please configure your OpenAI API key in the integrations settings.';
  }

  private generateCacheKey(promptOrMessages: string, context: AssistContext): string {
    const contextStr = JSON.stringify(context);
    return crypto.createHash('md5').update(promptOrMessages + contextStr).digest('hex');
  }

  private getCachedResponse(cacheKey: string): CachedResponse | null {
    const cached = this.cachedResponses.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) return cached;
    if (cached) this.cachedResponses.delete(cached.query);
    return null;
  }

  private cacheResponse(cacheKey: string, query: string, response: string, context: AssistContext): void {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.cacheExpiryHours);

    const cached: CachedResponse = {
      query,
      response,
      context,
      timestamp: new Date(),
      expiresAt,
    };

    this.cachedResponses.set(cacheKey, cached);
    void this.saveCachedResponses();
  }

  private async loadCachedResponses(): Promise<void> {
    try {
      const cached = await this.fileStorage.readFile(
        path.join(this.fileStorage['storagePath'], 'assist', 'cached-responses.json'),
      );
      if (cached && Array.isArray((cached as any).responses)) {
        (cached as any).responses.forEach((item: any) => {
          if (new Date(item.expiresAt) > new Date()) {
            this.cachedResponses.set(item.key, {
              ...item,
              timestamp: new Date(item.timestamp),
              expiresAt: new Date(item.expiresAt),
            });
          }
        });
      }
    } catch {
      this.logger.debug('No cached responses found or error loading cache');
    }
  }

  private async saveCachedResponses(): Promise<void> {
    try {
      const responses = Array.from(this.cachedResponses.entries()).map(([key, value]) => ({
        key,
        ...value,
      }));
      await this.fileStorage.writeFile(
        path.join(this.fileStorage['storagePath'], 'assist', 'cached-responses.json'),
        { responses },
      );
    } catch (error) {
      this.logger.error('Error saving cached responses:', error);
    }
  }

  async createSnapshot(): Promise<void> {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        clients: await this.clientsService.findAll({}),
        tasks: await this.tasksService.findAll({}),
        services: await this.servicesService.findAll({}),
        compliance: await this.complianceService.findAll({}),
      };
      await this.fileStorage.writeFile(
        path.join(this.fileStorage['storagePath'], 'assist', 'offline-snapshot.json'),
        snapshot,
      );
      this.logger.log('Offline snapshot created successfully');
    } catch (error) {
      this.logger.error('Error creating offline snapshot:', error);
    }
  }

  async processTemplateQuery(templateId: string, context: any = {}): Promise<string> {
    const template = this.queryTemplatesService.getTemplateById(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const prompt = this.queryTemplatesService.buildPromptFromTemplate(template, context);

    const assistContext: AssistContext = {
      includeClients: template.category === 'client' || template.category === 'business',
      includeTasks: template.category === 'task' || template.category === 'deadline',
      includeServices: template.category === 'business' || template.category === 'client',
      includeCompliance: template.category === 'compliance' || template.category === 'deadline',
    };

    if (context.clientRef) assistContext.clientRef = context.clientRef;
    if (context.portfolioCode) assistContext.portfolioCode = context.portfolioCode;
    if (context.userId) assistContext.userId = context.userId;

    return this.processQuery(prompt, assistContext);
  }

  getQueryTemplates(): QueryTemplate[] {
    return this.queryTemplatesService.getTemplates();
  }

  getQueryTemplatesByCategory(category: QueryTemplate['category']): QueryTemplate[] {
    return this.queryTemplatesService.getTemplatesByCategory(category);
  }

  getQuickActions(): QuickAction[] {
    return this.queryTemplatesService.getQuickActions();
  }

  searchQueryTemplates(query: string): QueryTemplate[] {
    return this.queryTemplatesService.searchTemplates(query);
  }

  async getContextualTemplates(context: { clientRef?: string; userId?: string }): Promise<QueryTemplate[]> {
    const contextInfo: any = {};
    try {
      if (context.userId) {
        const userTasks = await this.tasksService.findAll({ assignee: context.userId });
        contextInfo.hasOverdueTasks = userTasks.some(
          (task) => new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED',
        );
      }

      const upcomingDeadlines = await this.complianceService.findAll({
        dueDateFrom: new Date(),
        dueDateTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      contextInfo.hasUpcomingDeadlines = upcomingDeadlines.length > 0;

      if (context.clientRef) contextInfo.clientRef = context.clientRef;
    } catch (error) {
      this.logger.warn('Error gathering contextual information:', error);
    }

    return this.queryTemplatesService.getContextualTemplates(contextInfo);
  }

  async getBusinessInsightsWithRecommendations(): Promise<string> {
    const context: AssistContext = {
      includeClients: true,
      includeServices: true,
      includeTasks: true,
      includeCompliance: true,
    };

    const prompt = `
Provide comprehensive business insights and actionable recommendations for my practice:

ANALYSIS AREAS:
1. Revenue Performance & Trends
2. Client Portfolio Health
3. Service Delivery Efficiency
4. Compliance & Risk Management
5. Growth Opportunities

RECOMMENDATIONS:
- Immediate actions (next 30 days)
- Medium-term strategies (next quarter)
- Long-term growth initiatives

Focus on practical, implementable advice that will improve practice performance and client satisfaction.
    `.trim();

    return this.processQuery(prompt, context);
  }

  async getClientRiskAssessment(): Promise<string> {
    const context: AssistContext = {
      includeClients: true,
      includeServices: true,
      includeTasks: true,
      includeCompliance: true,
    };

    const prompt = `
Perform a client risk assessment across my portfolio:

RISK FACTORS TO ANALYZE:
1. Overdue payments or outstanding invoices
2. Compliance issues or missed deadlines
3. Reduced service engagement
4. Communication gaps
5. Service profitability concerns

PROVIDE:
- High-risk clients requiring immediate attention
- Medium-risk clients to monitor
- Recommended retention strategies
- Early warning indicators to watch

Focus on actionable insights to protect revenue and maintain client relationships.
    `.trim();

    return this.processQuery(prompt, context);
  }

  getStatus() {
    return {
      online: this.isOnline,
      mode: this.isOnline ? 'Online' : 'Offline',
      provider: this.isOnline ? 'OpenAI' : 'Local responses',
    };
  }
}