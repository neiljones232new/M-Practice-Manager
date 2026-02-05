import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import * as path from 'path';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { ClientPartyService } from '../clients/services/client-party.service';
import { PersonService } from '../clients/services/person.service';
import { TasksService } from '../tasks/tasks.service';
import { ServicesService } from '../services/services.service';
import { ComplianceService } from '../filings/compliance.service';
import { QueryTemplatesService, QueryTemplate, QuickAction } from './query-templates.service';
import { IntegrationConfigService } from '../integrations/services/integration-config.service';

export interface AssistContext {
  clientId?: string;
  portfolioCode?: number;
  userId?: string;
  includeClients?: boolean;
  includeTasks?: boolean;
  includeServices?: boolean;
  includeCompliance?: boolean;
  pageContext?: {
    path?: string;
    section?: string;
    search?: string;
  };
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
export class AssistService implements OnModuleInit {
  private readonly logger = new Logger(AssistService.name);
  private openai: OpenAI | null = null;
  private isOnline = false;
  private cachedResponses: Map<string, CachedResponse> = new Map();
  private readonly cacheExpiryHours = 24;
  private defaultModel: string;
  private readonly envApiKey: string | null;
  private readonly assistProvider: 'auto' | 'openai' | 'ollama';
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;
  private ollamaOnline: boolean | null = null;

  constructor(
    private configService: ConfigService,
    private queryTemplatesService: QueryTemplatesService,
    @Inject(forwardRef(() => FileStorageService))
    private fileStorage: FileStorageService,
    @Inject(forwardRef(() => IntegrationConfigService))
    private integrationConfigService: IntegrationConfigService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => ClientPartyService))
    private clientPartyService: ClientPartyService,
    @Inject(forwardRef(() => PersonService))
    private personService: PersonService,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
    @Inject(forwardRef(() => ServicesService))
    private servicesService: ServicesService,
    @Inject(forwardRef(() => ComplianceService))
    private complianceService: ComplianceService,
  ) {
    this.defaultModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4';
    this.envApiKey = this.configService.get<string>('OPENAI_API_KEY') || null;
    this.assistProvider = (this.configService.get<string>('ASSIST_PROVIDER') || 'auto') as
      | 'auto'
      | 'openai'
      | 'ollama';
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'llama3.1:8b';
    this.initializeOpenAI(this.envApiKey);
    this.loadCachedResponses(); // fire-and-forget
  }

  async onModuleInit() {
    await this.refreshOpenAIFromIntegrations();
  }

  private initializeOpenAI(apiKey?: string | null) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.isOnline = true;
      this.logger.log(`OpenAI integration initialized (model=${this.defaultModel}) — Online mode`);
    } else {
      this.logger.warn('OpenAI API key not found — running in OFFLINE mode');
      this.isOnline = false;
    }
  }

  private async refreshOpenAIFromIntegrations(): Promise<void> {
    try {
      const [integration, decryptedKey] = await Promise.all([
        this.integrationConfigService.getIntegrationByType('OPENAI'),
        this.integrationConfigService.getDecryptedApiKey('OPENAI'),
      ]);

      const integrationModel = integration?.settings?.model;
      if (typeof integrationModel === 'string' && integrationModel.trim()) {
        this.defaultModel = integrationModel.trim();
      }

      if (decryptedKey) {
        this.initializeOpenAI(decryptedKey);
        return;
      }

      if (this.envApiKey) {
        this.initializeOpenAI(this.envApiKey);
        return;
      }

      this.initializeOpenAI(null);
    } catch (error) {
      this.logger.warn('Failed to refresh OpenAI integration settings; falling back to env key');
      if (this.envApiKey) {
        this.initializeOpenAI(this.envApiKey);
      } else {
        this.initializeOpenAI(null);
      }
    }
  }

  private shouldUseOllama(): boolean {
    if (this.assistProvider === 'ollama') return true;
    if (this.assistProvider === 'openai') return false;
    return !this.isOnline || !this.openai;
  }

  private async callOllama(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    const base = this.ollamaUrl.replace(/\/+$/, '');
    const apiBase = base.endsWith('/api') ? base : `${base}/api`;

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream: false,
        }),
      });

      if (!res.ok) {
        this.ollamaOnline = false;
        throw new Error(`Ollama error ${res.status}`);
      }

      const data = await res.json();
      const content = data?.message?.content;
      if (!content) {
        this.ollamaOnline = false;
        throw new Error('Ollama response missing content');
      }
      this.ollamaOnline = true;
      return content;
    } catch (error) {
      this.ollamaOnline = false;
      throw error;
    } finally {
      clearTimeout(timeoutId);
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

    if (!this.isOnline || !this.openai) {
      await this.refreshOpenAIFromIntegrations();
    }

    if (this.shouldUseOllama()) {
      try {
        const response = await this.callOllama(prepared);
        this.cacheResponse(cacheKey, '[chat/ollama]', response, context);
        return response;
      } catch (err) {
        this.logger.warn('Ollama chat error; falling back to offline mode');
      }
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
    const lowerPrompt = (prompt || '').toLowerCase();
    const isMissingYearEndsQuery =
      lowerPrompt.includes('missing year end') ||
      lowerPrompt.includes('missing year-end') ||
      lowerPrompt.includes('missing year ends') ||
      lowerPrompt.includes('missing year-ends') ||
      lowerPrompt.includes('missing yearend') ||
      lowerPrompt.includes('missing yearends');
    const isAccountsLastMadeUpToCheck =
      lowerPrompt.includes('accountslastmadeupto') ||
      lowerPrompt.includes('accounts last made up to') ||
      lowerPrompt.includes('accounts last made-up to') ||
      lowerPrompt.includes('accounts last made-up-to');
    const isMainContactCheck =
      lowerPrompt.includes('maincontact') ||
      lowerPrompt.includes('main contact') ||
      lowerPrompt.includes('main-contact');
    const isDeterministic =
      isMissingYearEndsQuery || isAccountsLastMadeUpToCheck || isMainContactCheck;

    if (!isDeterministic) {
      const cacheKey = this.generateCacheKey(prompt, context);
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached response');
        return cached.response;
      }
    }

    const contextData = await this.generateContextData(context);

    if (isMissingYearEndsQuery && Array.isArray(contextData.clients)) {
      const missing = contextData.clients
        .filter((client: any) => {
          const hasLastMadeUpTo = Boolean(client.accountsLastMadeUpTo);
          const hasARD =
            Number.isFinite(client.accountsAccountingReferenceDay) &&
            Number.isFinite(client.accountsAccountingReferenceMonth);
          return !hasLastMadeUpTo && !hasARD;
        })
        .map((client: any) => ({
          identifier: client.registeredNumber || client.id || '—',
          name: client.name || 'Unnamed client',
        }));

      if (!missing.length) {
        return 'All clients in the current list have a year end recorded.';
      }

      const lines = missing
        .slice(0, 50)
        .map((client: any) => `- ${client.name} (${client.registeredNumber || client.id || '—'})`)
        .join('\n');

      return `Clients missing year end data (${missing.length}):\n${lines}\n\nUpdate the year end (accounts last made up to or accounting reference day/month) for these clients.`;
    }

    if (isMissingYearEndsQuery && !Array.isArray(contextData.clients)) {
      return 'I do not have a client list in context. Open the Clients page and try again so I can read the current list.';
    }

    if (isAccountsLastMadeUpToCheck && Array.isArray(contextData.clients)) {
      const missing = contextData.clients
        .filter((client: any) => !client.accountsLastMadeUpTo)
        .map((client: any) => ({
          identifier: client.registeredNumber || client.id || '—',
          name: client.name || 'Unnamed client',
        }));

      if (!missing.length) {
        return 'All clients in the current list have accountsLastMadeUpTo populated.';
      }

      const lines = missing
        .slice(0, 50)
        .map((client: any) => `- ${client.name} (${client.registeredNumber || client.id || '—'})`)
        .join('\n');

      return `Clients missing accountsLastMadeUpTo (${missing.length}):\n${lines}\n\nUpdate accountsLastMadeUpTo for these clients.`;
    }

    if (isAccountsLastMadeUpToCheck && !Array.isArray(contextData.clients)) {
      return 'I do not have a client list in context. Open the Clients page and try again so I can read the current list.';
    }

    if (isMainContactCheck && Array.isArray(contextData.clients)) {
      const clientIds = contextData.clients.map((client: any) => client.id).filter(Boolean);
      const primaryByClient = await this.getPrimaryContacts(clientIds);
      const missing = contextData.clients
        .filter((client: any) => {
          const primary = primaryByClient[client.id];
          return !primary && !client.mainEmail && !client.mainPhone;
        })
        .map((client: any) => ({
          identifier: client.registeredNumber || client.id || '—',
          name: client.name || 'Unnamed client',
        }));

      if (!missing.length) {
        return 'All clients in the current list have a main contact (primary contact or main email/phone).';
      }

      const lines = missing
        .slice(0, 50)
        .map((client: any) => `- ${client.name} (${client.registeredNumber || client.id || '—'})`)
        .join('\n');

      return `Clients missing a main contact (${missing.length}):\n${lines}\n\nSet a primary contact or add a main email/phone for these clients.`;
    }

    if (isMainContactCheck && !Array.isArray(contextData.clients)) {
      return 'I do not have a client list in context. Open the Clients page and try again so I can read the current list.';
    }

    const cacheKey = this.generateCacheKey(prompt, context);

    if (!this.isOnline || !this.openai) {
      await this.refreshOpenAIFromIntegrations();
    }

    if (this.shouldUseOllama()) {
      try {
        const response = await this.callOllama([
          { role: 'system', content: this.buildSystemPrompt(contextData) },
          { role: 'user', content: prompt },
        ]);
        this.cacheResponse(cacheKey, '[ollama]', response, context);
        return response;
      } catch (err) {
        this.logger.warn('Ollama query error; falling back to offline mode');
      }
    }

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

  async getClientSummary(clientId: string): Promise<string> {
    const context: AssistContext = {
      clientId,
      includeClients: true,
      includeServices: true,
      includeTasks: true,
      includeCompliance: true,
    };
    const prompt = `Provide a comprehensive summary of client ${clientId} including their services, recent tasks, compliance status, and any recommendations.`;
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

    if (context.pageContext) {
      contextData.pageContext = context.pageContext;
    }

    const includeClients = context.includeClients || !!context.clientId;
    const includeServices = context.includeServices || includeClients;

    try {
      if (includeClients) {
        const filters: any = {};
        if (context.portfolioCode) filters.portfolioCode = context.portfolioCode;

        if (context.clientId) {
          const client =
            (await this.clientsService.findOne(context.clientId)) ||
            (await this.clientsService.findByIdentifier(context.clientId));
          contextData.client = client;
        } else {
          const clients = await this.clientsService.findAll(filters);
          contextData.clients = clients.slice(0, 50);
        }
      }

      if (context.includeTasks) {
        const taskFilters: any = {};
        if (context.userId) taskFilters.assigneeId = context.userId;
        if (context.clientId) taskFilters.clientId = context.clientId;
        if (context.dateRange) taskFilters.dueDateRange = context.dateRange;

        const tasks = await this.tasksService.findAll(taskFilters);
        contextData.tasks = tasks.slice(0, 100);
      }

      if (includeServices) {
        const serviceFilters: any = {};
        if (context.clientId) serviceFilters.clientId = context.clientId;

        const services = await this.servicesService.findAll(serviceFilters);
        contextData.services = services.slice(0, 100);
      }

      if (context.includeCompliance) {
        const complianceFilters: any = {};
        if (context.clientId) complianceFilters.clientId = context.clientId;
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

  private async getPrimaryContacts(clientIds: string[]): Promise<Record<string, string>> {
    if (!clientIds.length) return {};
    const [parties, people] = await Promise.all([
      this.clientPartyService.findAll(),
      this.personService.findAll(),
    ]);
    const peopleMap: Record<string, any> = {};
    people.forEach((person: any) => {
      if (person?.id) peopleMap[person.id] = person;
    });
    const primaryByClient: Record<string, string> = {};
    parties.forEach((party: any) => {
      if (!party?.primaryContact) return;
      if (!party?.clientId || !clientIds.includes(party.clientId)) return;
      const person = peopleMap[party.personId];
      if (person?.fullName) primaryByClient[party.clientId] = person.fullName;
    });
    return primaryByClient;
  }

  private buildSystemPrompt(contextData: any): string {
    return `
You are M Assist — a professional practice assistant for accounting and tax professionals.
You help with client management, compliance deadlines, task prioritization, and business insights.

CURRENT CONTEXT:
${JSON.stringify(contextData, null, 2)}

GUIDELINES:
- Provide concise, actionable advice
- Focus on practical solutions for professional practice management
- Prioritize urgent items (overdue tasks, approaching deadlines)
- Use specific data from the context when available
- Format responses clearly with bullet points or numbered lists when appropriate
- Only mention client names, references, dates, or amounts that appear in the context
- If data is limited or missing, acknowledge this and provide general guidance

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
        
Client: ${client.name} (${client.registeredNumber || client.id})
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

    return 'M Assist is currently in offline mode. Configure OpenAI in integrations or run a local Ollama model.';
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

    if (context.clientId) assistContext.clientId = context.clientId;
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

  async getContextualTemplates(context: { clientId?: string; userId?: string }): Promise<QueryTemplate[]> {
    const contextInfo: any = {};
    try {
      if (context.userId) {
        const userTasks = await this.tasksService.findAll({ assigneeId: context.userId });
        contextInfo.hasOverdueTasks = userTasks.some(
          (task) => new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED',
        );
      }

      const upcomingDeadlines = await this.complianceService.findAll({
        dueDateFrom: new Date(),
        dueDateTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      contextInfo.hasUpcomingDeadlines = upcomingDeadlines.length > 0;

      if (context.clientId) contextInfo.clientId = context.clientId;
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
    if (this.shouldUseOllama()) {
      const online = this.ollamaOnline === true;
      return {
        online,
        mode: online ? 'Online' : 'Offline',
        provider: 'Ollama',
      };
    }

    return {
      online: this.isOnline,
      mode: this.isOnline ? 'Online' : 'Offline',
      provider: this.isOnline ? 'OpenAI' : 'Local responses',
    };
  }
}
