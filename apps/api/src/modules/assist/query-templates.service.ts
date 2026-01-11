import { Injectable, Logger } from '@nestjs/common';

export interface QueryTemplate {
  id: string;
  category: 'client' | 'deadline' | 'task' | 'business' | 'compliance' | 'general';
  title: string;
  description: string;
  prompt: string;
  icon?: string;
  requiresContext?: boolean;
  contextFields?: string[];
  examples?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  template: QueryTemplate;
  defaultContext?: any;
}

@Injectable()
export class QueryTemplatesService {
  private readonly logger = new Logger(QueryTemplatesService.name);

  private readonly templates: QueryTemplate[] = [
    // Client Management Templates
    {
      id: 'client-summary',
      category: 'client',
      title: 'Client Summary',
      description: 'Get a comprehensive overview of a specific client',
      prompt: 'Provide a detailed summary of client {clientRef} including their current services, recent activity, compliance status, outstanding tasks, and any recommendations for improving our service delivery.',
      icon: 'user',
      requiresContext: true,
      contextFields: ['clientRef'],
      examples: ['Summarize client 1A001', 'Give me an overview of ABC Limited'],
    },
    {
      id: 'client-portfolio-analysis',
      category: 'client',
      title: 'Portfolio Analysis',
      description: 'Analyze client portfolio performance and opportunities',
      prompt: 'Analyze my client portfolio focusing on: 1) Revenue distribution across client types, 2) Service utilization patterns, 3) Growth opportunities, 4) At-risk clients, and 5) Recommendations for portfolio optimization.',
      icon: 'chart-bar',
      requiresContext: false,
      examples: ['Analyze my client portfolio', 'Show portfolio insights'],
    },
    {
      id: 'client-onboarding-checklist',
      category: 'client',
      title: 'Onboarding Checklist',
      description: 'Generate onboarding tasks for new clients',
      prompt: 'Create a comprehensive onboarding checklist for new client {clientRef} of type {clientType}. Include all necessary documentation, setup tasks, compliance requirements, and initial service delivery steps.',
      icon: 'clipboard-list',
      requiresContext: true,
      contextFields: ['clientRef', 'clientType'],
      examples: ['Create onboarding checklist for new company client'],
    },

    // Deadline and Compliance Templates
    {
      id: 'deadline-check',
      category: 'deadline',
      title: 'Deadline Check',
      description: 'Review upcoming deadlines and overdue items',
      prompt: 'Check all upcoming deadlines for the next {days} days. Prioritize by urgency and impact. Include: 1) Overdue items requiring immediate attention, 2) This week\'s deadlines, 3) Next week\'s deadlines, 4) Recommended actions for each item.',
      icon: 'calendar',
      requiresContext: false,
      examples: ['Check deadlines for next 30 days', 'What\'s overdue?'],
    },
    {
      id: 'compliance-review',
      category: 'compliance',
      title: 'Compliance Review',
      description: 'Review compliance status across all clients',
      prompt: 'Provide a comprehensive compliance review including: 1) Clients with overdue filings, 2) Upcoming statutory deadlines, 3) Compliance risk assessment, 4) Recommended actions to maintain good standing.',
      icon: 'shield-check',
      requiresContext: false,
      examples: ['Review compliance status', 'Check filing requirements'],
    },
    {
      id: 'vat-return-reminder',
      category: 'compliance',
      title: 'VAT Return Reminders',
      description: 'Check VAT return deadlines and preparation status',
      prompt: 'Review all VAT return deadlines for the next quarter. Identify: 1) Returns due this month, 2) Clients requiring data collection, 3) Returns ready for submission, 4) Any potential issues or delays.',
      icon: 'receipt-tax',
      requiresContext: false,
      examples: ['Check VAT returns', 'VAT deadline review'],
    },

    // Task Management Templates
    {
      id: 'priority-tasks',
      category: 'task',
      title: 'Priority Tasks',
      description: 'Identify and prioritize current tasks',
      prompt: 'Analyze my current tasks and provide priority recommendations. Focus on: 1) Overdue tasks requiring immediate attention, 2) High-impact tasks due this week, 3) Tasks blocking other work, 4) Optimal task sequencing for maximum efficiency.',
      icon: 'exclamation',
      requiresContext: false,
      examples: ['What should I work on first?', 'Prioritize my tasks'],
    },
    {
      id: 'workload-analysis',
      category: 'task',
      title: 'Workload Analysis',
      description: 'Analyze current workload and capacity',
      prompt: 'Analyze my current workload including: 1) Total active tasks by priority, 2) Estimated time requirements, 3) Capacity vs. demand analysis, 4) Recommendations for workload management and delegation opportunities.',
      icon: 'chart-line',
      requiresContext: false,
      examples: ['Analyze my workload', 'Am I overloaded?'],
    },
    {
      id: 'task-delegation',
      category: 'task',
      title: 'Delegation Opportunities',
      description: 'Identify tasks suitable for delegation',
      prompt: 'Review my current tasks and identify delegation opportunities. Consider: 1) Tasks suitable for junior staff, 2) Routine tasks that can be systematized, 3) Training opportunities, 4) Specific delegation recommendations with rationale.',
      icon: 'users',
      requiresContext: false,
      examples: ['What can I delegate?', 'Find delegation opportunities'],
    },

    // Business Insights Templates
    {
      id: 'business-insights',
      category: 'business',
      title: 'Business Insights',
      description: 'Generate business performance insights and recommendations',
      prompt: 'Provide comprehensive business insights including: 1) Revenue trends and patterns, 2) Service profitability analysis, 3) Client satisfaction indicators, 4) Growth opportunities, 5) Operational efficiency recommendations.',
      icon: 'trending-up',
      requiresContext: false,
      examples: ['Show business insights', 'How is my practice performing?'],
    },
    {
      id: 'revenue-forecast',
      category: 'business',
      title: 'Revenue Forecast',
      description: 'Forecast revenue based on current services and trends',
      prompt: 'Create a revenue forecast for the next 12 months based on: 1) Current active services and fees, 2) Historical growth patterns, 3) Seasonal variations, 4) New client acquisition trends, 5) Recommendations for revenue optimization.',
      icon: 'calculator',
      requiresContext: false,
      examples: ['Forecast my revenue', 'What will I earn this year?'],
    },
    {
      id: 'client-retention',
      category: 'business',
      title: 'Client Retention Analysis',
      description: 'Analyze client retention and identify at-risk clients',
      prompt: 'Analyze client retention including: 1) Client tenure patterns, 2) At-risk clients based on engagement metrics, 3) Retention improvement opportunities, 4) Strategies for strengthening client relationships.',
      icon: 'heart',
      requiresContext: false,
      examples: ['Check client retention', 'Which clients might leave?'],
    },

    // General Help Templates
    {
      id: 'practice-optimization',
      category: 'general',
      title: 'Practice Optimization',
      description: 'Get recommendations for improving practice efficiency',
      prompt: 'Provide practice optimization recommendations focusing on: 1) Process improvements, 2) Technology utilization, 3) Service delivery enhancements, 4) Time management strategies, 5) Growth opportunities.',
      icon: 'cog',
      requiresContext: false,
      examples: ['How can I improve my practice?', 'Optimize my workflow'],
    },
    {
      id: 'market-opportunities',
      category: 'business',
      title: 'Market Opportunities',
      description: 'Identify potential market opportunities and service expansion',
      prompt: 'Identify market opportunities based on my current client base: 1) Underutilized services, 2) Cross-selling opportunities, 3) New service areas to consider, 4) Market trends affecting my clients, 5) Expansion recommendations.',
      icon: 'target',
      requiresContext: false,
      examples: ['Find new opportunities', 'What services should I add?'],
    },
  ];

  getTemplates(): QueryTemplate[] {
    return this.templates;
  }

  getTemplatesByCategory(category: QueryTemplate['category']): QueryTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  getTemplateById(id: string): QueryTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  getQuickActions(): QuickAction[] {
    return [
      {
        id: 'check-deadlines-30',
        label: 'Check upcoming deadlines',
        description: 'Review deadlines for the next 30 days',
        template: this.getTemplateById('deadline-check')!,
        defaultContext: { days: 30 },
      },
      {
        id: 'priority-tasks-today',
        label: 'Show priority tasks',
        description: 'Get prioritized task recommendations',
        template: this.getTemplateById('priority-tasks')!,
      },
      {
        id: 'business-insights-general',
        label: 'Business insights',
        description: 'Get comprehensive business performance insights',
        template: this.getTemplateById('business-insights')!,
      },
      {
        id: 'compliance-review-general',
        label: 'Compliance review',
        description: 'Review compliance status across all clients',
        template: this.getTemplateById('compliance-review')!,
      },
      {
        id: 'client-portfolio-analysis',
        label: 'Portfolio analysis',
        description: 'Analyze client portfolio performance',
        template: this.getTemplateById('client-portfolio-analysis')!,
      },
      {
        id: 'workload-analysis-general',
        label: 'Workload analysis',
        description: 'Analyze current workload and capacity',
        template: this.getTemplateById('workload-analysis')!,
      },
    ];
  }

  buildPromptFromTemplate(template: QueryTemplate, context: any = {}): string {
    let prompt = template.prompt;
    
    // Replace context placeholders
    Object.keys(context).forEach(key => {
      const placeholder = `{${key}}`;
      if (prompt.includes(placeholder)) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), context[key]);
      }
    });

    return prompt;
  }

  searchTemplates(query: string): QueryTemplate[] {
    const lowerQuery = query.toLowerCase();
    
    return this.templates.filter(template => 
      template.title.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.examples?.some(example => 
        example.toLowerCase().includes(lowerQuery)
      )
    );
  }

  getContextualTemplates(context: { clientRef?: string; hasOverdueTasks?: boolean; hasUpcomingDeadlines?: boolean }): QueryTemplate[] {
    const contextualTemplates: QueryTemplate[] = [];

    // If we have a specific client, suggest client-specific templates
    if (context.clientRef) {
      contextualTemplates.push(
        this.getTemplateById('client-summary')!,
        this.getTemplateById('client-onboarding-checklist')!
      );
    }

    // If there are overdue tasks, suggest task management templates
    if (context.hasOverdueTasks) {
      contextualTemplates.push(
        this.getTemplateById('priority-tasks')!,
        this.getTemplateById('workload-analysis')!
      );
    }

    // If there are upcoming deadlines, suggest deadline templates
    if (context.hasUpcomingDeadlines) {
      contextualTemplates.push(
        this.getTemplateById('deadline-check')!,
        this.getTemplateById('compliance-review')!
      );
    }

    // Always include general business insights
    contextualTemplates.push(this.getTemplateById('business-insights')!);

    // Remove duplicates and return
    return contextualTemplates.filter((template, index, self) => 
      self.findIndex(t => t.id === template.id) === index
    );
  }
}