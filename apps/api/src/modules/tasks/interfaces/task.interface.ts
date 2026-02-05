export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  clientId?: string;
  serviceId?: string;
  description?: string;
  dueDate?: Date;
  assigneeId?: string;
  assignee?: string;
  creatorId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilters {
  clientId?: string;
  serviceId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueBefore?: Date;
  dueAfter?: Date;
  portfolioCode?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTaskDto {
  title: string;
  clientId?: string;
  serviceId?: string;
  description?: string;
  dueDate?: Date;
  assigneeId?: string;
  creatorId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: Date;
  assigneeId?: string;
  creatorId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
}

export type ServiceFrequency = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY' | 'ONE_OFF';
export type ServicePricingModel = 'per_period' | 'per_service' | 'one_off';
export type ServiceAppliesTo = 'Company' | 'Individual' | 'Sole Trader' | 'Partnership' | 'LLP' | 'Director';

export interface ServiceTemplate {
  id: string;
  serviceKind: string;
  frequency: ServiceFrequency;
  appliesTo?: ServiceAppliesTo[];
  complianceImpact?: boolean;
  pricingModel?: ServicePricingModel;
  taskTemplates: TaskTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  daysBeforeDue: number; // How many days before service due date to create task
  priority: TaskPriority;
  tags: string[];
  assigneeId?: string;
}

export interface CreateServiceTemplateDto {
  serviceKind: string;
  frequency: ServiceFrequency;
  appliesTo?: ServiceAppliesTo[];
  complianceImpact?: boolean;
  pricingModel?: ServicePricingModel;
  taskTemplates: Omit<TaskTemplate, 'id'>[];
}

export interface UpdateServiceTemplateDto {
  serviceKind?: string;
  frequency?: ServiceFrequency;
  appliesTo?: ServiceAppliesTo[];
  complianceImpact?: boolean;
  pricingModel?: ServicePricingModel;
  taskTemplates?: Omit<TaskTemplate, 'id'>[];
}

export interface StandaloneTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStandaloneTaskTemplateDto {
  title: string;
  description: string;
  category: string;
  priority?: TaskPriority;
  tags?: string[];
}

export interface UpdateStandaloneTaskTemplateDto {
  title?: string;
  description?: string;
  category?: string;
  priority?: TaskPriority;
  tags?: string[];
}

export const TASK_TEMPLATE_CATEGORIES = [
  'Client Communication',
  'Billing & Credit Control',
  'Practice Administration',
  'Email & Correspondence',
  'Client Job Workflow',
  'Internal Operations',
  'Marketing & Growth',
] as const;

export type TaskTemplateCategory = typeof TASK_TEMPLATE_CATEGORIES[number];
