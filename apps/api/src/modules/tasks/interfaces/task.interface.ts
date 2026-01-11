export interface Task {
  id: string;
  clientId: string;
  serviceId?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  assignee?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilters {
  clientId?: string;
  serviceId?: string;
  assignee?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueBefore?: Date;
  dueAfter?: Date;
  portfolioCode?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTaskDto {
  clientId: string;
  serviceId?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  assignee?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: Date;
  assignee?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}

export interface ServiceTemplate {
  id: string;
  serviceKind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  taskTemplates: TaskTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  daysBeforeDue: number; // How many days before service due date to create task
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  assignee?: string;
}

export interface CreateServiceTemplateDto {
  serviceKind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  taskTemplates: Omit<TaskTemplate, 'id'>[];
}

export interface UpdateServiceTemplateDto {
  serviceKind?: string;
  frequency?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  taskTemplates?: Omit<TaskTemplate, 'id'>[];
}

// Standalone Task Template Interfaces
export interface StandaloneTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStandaloneTaskTemplateDto {
  title: string;
  description: string;
  category: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}

export interface UpdateStandaloneTaskTemplateDto {
  title?: string;
  description?: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}

// Task Template Categories
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