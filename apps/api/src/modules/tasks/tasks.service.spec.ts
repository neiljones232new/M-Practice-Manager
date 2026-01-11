import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { 
  Task, 
  CreateTaskDto, 
  UpdateTaskDto, 
  ServiceTemplate, 
  CreateServiceTemplateDto 
} from './interfaces/task.interface';

describe('TasksService', () => {
  let service: TasksService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let clientsService: jest.Mocked<ClientsService>;
  let servicesService: jest.Mocked<ServicesService>;

  const upcomingDue = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

  const mockClient = {
    id: 'client_123',
    ref: '1A001',
    name: 'Test Company Ltd',
    type: 'COMPANY' as const,
    portfolioCode: 1,
    status: 'ACTIVE' as const,
    services: [],
    parties: [],
    tasks: [],
    documents: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockService = {
    id: 'service_123',
    clientId: 'client_123',
    kind: 'Annual Accounts',
    frequency: 'ANNUAL' as const,
    fee: 1000,
    annualized: 1000,
    status: 'ACTIVE' as const,
    nextDue: new Date(upcomingDue),
    description: 'Annual accounts preparation',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTask: Task = {
    id: 'task_123',
    clientId: 'client_123',
    serviceId: 'service_123',
    title: 'Prepare annual accounts',
    description: 'Review and prepare annual accounts',
    dueDate: new Date('2024-11-30'),
    assignee: 'john.doe',
    status: 'OPEN',
    priority: 'HIGH',
    tags: ['accounts', 'preparation'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockServiceTemplate: ServiceTemplate = {
    id: 'template_123',
    serviceKind: 'Annual Accounts',
    frequency: 'ANNUAL',
    taskTemplates: [
      {
        id: 'task_template_1',
        title: 'Request client records',
        description: 'Contact client for records',
        daysBeforeDue: 60,
        priority: 'HIGH',
        tags: ['preparation'],
      },
      {
        id: 'task_template_2',
        title: 'Prepare accounts',
        description: 'Review and prepare accounts',
        daysBeforeDue: 30,
        priority: 'HIGH',
        tags: ['preparation', 'accounts'],
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      searchFiles: jest.fn(),
    };

    const mockClientsService = {
      findOne: jest.fn(),
      findByPortfolio: jest.fn(),
    };

    const mockServicesService = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      updateNextDueDate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    fileStorageService = module.get(FileStorageService);
    clientsService = module.get(ClientsService);
    servicesService = module.get(ServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTaskDto: CreateTaskDto = {
      clientId: 'client_123',
      serviceId: 'service_123',
      title: 'Test Task',
      description: 'Test task description',
      dueDate: new Date('2024-12-31'),
      assignee: 'john.doe',
      priority: 'HIGH',
      tags: ['test'],
    };

    it('should create a task successfully', async () => {
      clientsService.findOne.mockResolvedValue(mockClient);
      servicesService.findOne.mockResolvedValue(mockService);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createTaskDto);

      expect(result).toMatchObject({
        clientId: createTaskDto.clientId,
        serviceId: createTaskDto.serviceId,
        title: createTaskDto.title,
        description: createTaskDto.description,
        dueDate: createTaskDto.dueDate,
        assignee: createTaskDto.assignee,
        priority: createTaskDto.priority,
        tags: createTaskDto.tags,
        status: 'OPEN', // Default status
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('tasks', result.id, result);
    });

    it('should throw NotFoundException when client does not exist', async () => {
      clientsService.findOne.mockResolvedValue(null);

      await expect(service.create(createTaskDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when service does not exist', async () => {
      clientsService.findOne.mockResolvedValue(mockClient);
      servicesService.findOne.mockResolvedValue(null);

      await expect(service.create(createTaskDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should create task without service validation when serviceId is not provided', async () => {
      const taskWithoutService = { ...createTaskDto, serviceId: undefined };
      clientsService.findOne.mockResolvedValue(mockClient);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(taskWithoutService);

      expect(result.serviceId).toBeUndefined();
      expect(servicesService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all tasks without filters', async () => {
      const mockTasks = [mockTask];
      fileStorageService.searchFiles.mockResolvedValue(mockTasks);

      const result = await service.findAll();

      expect(result).toEqual(mockTasks);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('tasks', expect.any(Function));
    });

    it('should apply pagination', async () => {
      const mockTasks = Array.from({ length: 100 }, (_, i) => ({
        ...mockTask,
        id: `task_${i}`,
      }));
      fileStorageService.searchFiles.mockResolvedValue(mockTasks);

      const result = await service.findAll({ limit: 10, offset: 20 });

      expect(result).toHaveLength(10);
      expect(result[0].id).toBe('task_20');
    });
  });

  describe('findOverdue', () => {
    it('should return overdue tasks', async () => {
      const overdueTask = {
        ...mockTask,
        dueDate: new Date('2023-12-31'), // Past date
        status: 'OPEN' as const,
      };
      
      // Mock searchFiles to return only the overdue task
      fileStorageService.searchFiles.mockResolvedValue([overdueTask]);

      const result = await service.findOverdue();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(overdueTask.id);
    });
  });

  describe('findDueSoon', () => {
    it('should return tasks due within specified days', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dueSoonTask = {
        ...mockTask,
        dueDate: tomorrow,
        status: 'OPEN' as const,
      };
      
      fileStorageService.searchFiles.mockResolvedValue([dueSoonTask]);

      const result = await service.findDueSoon(7);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(dueSoonTask.id);
    });
  });

  describe('update', () => {
    const updateTaskDto: UpdateTaskDto = {
      title: 'Updated Task',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
    };

    it('should update a task successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockTask);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('task_123', updateTaskDto);

      expect(result).toMatchObject({
        ...mockTask,
        ...updateTaskDto,
        updatedAt: expect.any(Date),
      });
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('tasks', 'task_123', result);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateTaskDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a task successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockTask);
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      const result = await service.delete('task_123');

      expect(result).toBe(true);
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('tasks', 'task_123');
    });

    it('should return false when task does not exist', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });
  });

  describe('createServiceTemplate', () => {
    const createTemplateDto: CreateServiceTemplateDto = {
      serviceKind: 'VAT Returns',
      frequency: 'QUARTERLY',
      taskTemplates: [
        {
          title: 'Collect VAT records',
          description: 'Gather sales and purchase records',
          daysBeforeDue: 21,
          priority: 'HIGH',
          tags: ['preparation'],
        },
      ],
    };

    it('should create a service template successfully', async () => {
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.createServiceTemplate(createTemplateDto);

      expect(result).toMatchObject({
        serviceKind: createTemplateDto.serviceKind,
        frequency: createTemplateDto.frequency,
      });
      expect(result.taskTemplates).toHaveLength(1);
      expect(result.taskTemplates[0]).toMatchObject(createTemplateDto.taskTemplates[0]);
      expect(result.taskTemplates[0].id).toBeDefined();
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('service-templates', result.id, result);
    });
  });

  describe('generateTasksFromService', () => {
    it('should generate tasks from service template', async () => {
      servicesService.findOne.mockResolvedValue(mockService);
      fileStorageService.searchFiles.mockResolvedValue([mockServiceTemplate]);
      clientsService.findOne.mockResolvedValue(mockClient);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.generateTasksFromService('service_123');

      expect(result).toHaveLength(2); // Two task templates in mock
      expect(servicesService.findOne).toHaveBeenCalledWith('service_123');
      expect(fileStorageService.writeJson).toHaveBeenCalledTimes(2); // Two tasks created
      
      // Check that tasks have correct due dates calculated from service due date
      result.forEach((task, index) => {
        const template = mockServiceTemplate.taskTemplates[index];
        const expectedDueDate = new Date(mockService.nextDue!.getTime() - (template.daysBeforeDue * 24 * 60 * 60 * 1000));
        expect(task.dueDate).toEqual(expectedDueDate);
        expect(task.tags).toContain('auto-generated');
      });
    });

    it('should throw NotFoundException when service does not exist', async () => {
      servicesService.findOne.mockResolvedValue(null);

      await expect(service.generateTasksFromService('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no template found', async () => {
      servicesService.findOne.mockResolvedValue(mockService);
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.generateTasksFromService('service_123');

      expect(result).toEqual([]);
    });
  });

  describe('generateTasksForAllServices', () => {
    it('should generate tasks for all active services without existing open tasks', async () => {
      const services = [mockService];
      servicesService.findAll.mockResolvedValue(services);
      
      // Mock searchFiles to return different results for different calls
      fileStorageService.searchFiles
        .mockResolvedValueOnce([]) // No existing tasks for service (findByService call)
        .mockResolvedValueOnce([mockServiceTemplate]); // Service template found (findServiceTemplate call)
      
      clientsService.findOne.mockResolvedValue(mockClient);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      // Mock the generateTasksFromService method to avoid the actual implementation
      const generateTasksFromServiceSpy = jest.spyOn(service, 'generateTasksFromService')
        .mockResolvedValue([mockTask, { ...mockTask, id: 'task_2' }]);

      const result = await service.generateTasksForAllServices();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        serviceId: mockService.id,
        tasksGenerated: 2, // Two task templates
      });
      
      generateTasksFromServiceSpy.mockRestore();
    });

    it('should skip services with existing open tasks', async () => {
      const services = [mockService];
      const existingOpenTask = { ...mockTask, status: 'OPEN' as const };
      
      servicesService.findAll.mockResolvedValue(services);
      fileStorageService.searchFiles.mockResolvedValue([existingOpenTask]);

      const result = await service.generateTasksForAllServices();

      expect(result).toEqual([]);
    });

    it('should skip services outside the task generation window', async () => {
      servicesService.findAll.mockResolvedValue([
        { ...mockService, nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
      ]);

      const result = await service.generateTasksForAllServices();

      expect(result).toEqual([]);
    });
  });

  describe('generateTasksForClient', () => {
    it('should generate tasks for a client\'s services within the window', async () => {
      servicesService.findByClient.mockResolvedValue([mockService]);
      servicesService.findOne.mockResolvedValue(mockService);
      clientsService.findOne.mockResolvedValue(mockClient);
      fileStorageService.searchFiles
        .mockResolvedValueOnce([]) // existing tasks
        .mockResolvedValueOnce([mockServiceTemplate]); // template lookup
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.generateTasksForClient('client_123');

      expect(result).toEqual([
        {
          serviceId: mockService.id,
          tasksGenerated: mockServiceTemplate.taskTemplates.length,
        },
      ]);
    });

    it('should skip services with open tasks', async () => {
      servicesService.findByClient.mockResolvedValue([mockService]);
      const existingOpenTask = { ...mockTask, status: 'OPEN' as const };
      fileStorageService.searchFiles.mockResolvedValueOnce([existingOpenTask]);

      const result = await service.generateTasksForClient('client_123');

      expect(result).toEqual([]);
    });

    it('should skip services outside the task generation window', async () => {
      const distantService = { ...mockService, nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) };
      servicesService.findByClient.mockResolvedValue([distantService]);

      const result = await service.generateTasksForClient('client_123');

      expect(result).toEqual([]);
    });
  });

  describe('updateServiceNextDueDate', () => {
    it('should update next due date for weekly service', async () => {
      const weeklyService = { ...mockService, frequency: 'WEEKLY' as const };
      servicesService.findOne.mockResolvedValue(weeklyService);
      servicesService.updateNextDueDate.mockResolvedValue(undefined);

      await service.updateServiceNextDueDate('service_123');

      const expectedNextDue = new Date(weeklyService.nextDue!.getTime() + (7 * 24 * 60 * 60 * 1000));
      expect(servicesService.updateNextDueDate).toHaveBeenCalledWith('service_123', expectedNextDue);
    });

    it('should update next due date for monthly service', async () => {
      const monthlyService = { ...mockService, frequency: 'MONTHLY' as const };
      servicesService.findOne.mockResolvedValue(monthlyService);
      servicesService.updateNextDueDate.mockResolvedValue(undefined);

      await service.updateServiceNextDueDate('service_123');

      expect(servicesService.updateNextDueDate).toHaveBeenCalled();
      const callArgs = servicesService.updateNextDueDate.mock.calls[0];
      const nextDue = callArgs[1] as Date;
      expect(nextDue.getMonth()).toBe((monthlyService.nextDue!.getMonth() + 1) % 12);
    });

    it('should update next due date for quarterly service', async () => {
      const quarterlyService = { ...mockService, frequency: 'QUARTERLY' as const };
      servicesService.findOne.mockResolvedValue(quarterlyService);
      servicesService.updateNextDueDate.mockResolvedValue(undefined);

      await service.updateServiceNextDueDate('service_123');

      expect(servicesService.updateNextDueDate).toHaveBeenCalled();
      const callArgs = servicesService.updateNextDueDate.mock.calls[0];
      const nextDue = callArgs[1] as Date;
      expect(nextDue.getMonth()).toBe((quarterlyService.nextDue!.getMonth() + 3) % 12);
    });

    it('should update next due date for annual service', async () => {
      servicesService.findOne.mockResolvedValue(mockService);
      servicesService.updateNextDueDate.mockResolvedValue(undefined);

      await service.updateServiceNextDueDate('service_123');

      expect(servicesService.updateNextDueDate).toHaveBeenCalled();
      const callArgs = servicesService.updateNextDueDate.mock.calls[0];
      const nextDue = callArgs[1] as Date;
      expect(nextDue.getFullYear()).toBe(mockService.nextDue!.getFullYear() + 1);
    });

    it('should not update when service has no next due date', async () => {
      const serviceWithoutDue = { ...mockService, nextDue: undefined };
      servicesService.findOne.mockResolvedValue(serviceWithoutDue);

      await service.updateServiceNextDueDate('service_123');

      expect(servicesService.updateNextDueDate).not.toHaveBeenCalled();
    });
  });

  describe('findAllWithClientDetails', () => {
    it('should return tasks with client details', async () => {
      const mockTasks = [mockTask];
      fileStorageService.searchFiles.mockResolvedValue(mockTasks);
      clientsService.findOne.mockResolvedValue(mockClient);
      servicesService.findOne.mockResolvedValue(mockService);

      const result = await service.findAllWithClientDetails();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockTask,
        clientName: mockClient.name,
        clientRef: mockClient.ref,
        portfolioCode: mockClient.portfolioCode,
        serviceName: mockService.kind,
      });
    });

    it('should handle missing client gracefully', async () => {
      const mockTasks = [mockTask];
      fileStorageService.searchFiles.mockResolvedValue(mockTasks);
      clientsService.findOne.mockResolvedValue(null);

      const result = await service.findAllWithClientDetails();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockTask,
        clientName: 'Unknown Client',
        clientRef: 'N/A',
        portfolioCode: 0,
      });
    });
  });

  describe('getTaskSummary', () => {
    it('should return task summary statistics', async () => {
      const now = new Date();
      const overdue = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)); // 2 days ago
      const dueSoon = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days from now

      const mockTasks = [
        { ...mockTask, id: 'task_1', status: 'OPEN' as const, priority: 'HIGH' as const, dueDate: overdue },
        { ...mockTask, id: 'task_2', status: 'IN_PROGRESS' as const, priority: 'URGENT' as const, dueDate: dueSoon },
        { ...mockTask, id: 'task_3', status: 'COMPLETED' as const, priority: 'MEDIUM' as const, dueDate: undefined },
        { ...mockTask, id: 'task_4', status: 'OPEN' as const, priority: 'LOW' as const, dueDate: undefined },
      ];

      fileStorageService.searchFiles.mockResolvedValue(mockTasks);

      const result = await service.getTaskSummary();

      expect(result).toEqual({
        totalTasks: 4,
        openTasks: 2,
        inProgressTasks: 1,
        overdueTasks: 1, // Only task_1 is overdue and not completed/cancelled
        dueSoonTasks: 1, // Only task_2 is due soon and not completed/cancelled
        tasksByPriority: {
          LOW: 1,
          MEDIUM: 1,
          HIGH: 1,
          URGENT: 1,
        },
        tasksByStatus: {
          OPEN: 2,
          IN_PROGRESS: 1,
          COMPLETED: 1,
          CANCELLED: 0,
        },
      });
    });

    it('should filter by portfolio when specified', async () => {
      const mockTasks = [mockTask];
      const mockClients = [mockClient];
      
      fileStorageService.searchFiles.mockResolvedValue(mockTasks);
      clientsService.findByPortfolio.mockResolvedValue(mockClients);

      const result = await service.getTaskSummary(1);

      expect(clientsService.findByPortfolio).toHaveBeenCalledWith(1);
      expect(result.totalTasks).toBe(1);
    });
  });

  describe('getDashboardAlerts', () => {
    it('should return dashboard alerts with categorized tasks', async () => {
      const now = new Date();
      // Set specific times to avoid date boundary issues
      now.setHours(12, 0, 0, 0);
      
      const overdue = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Yesterday
      const today = new Date(now);
      today.setHours(23, 59, 59, 999); // End of today
      const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      const nextWeek = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));

      const mockTasks = [
        { ...mockTask, id: 'overdue_task', dueDate: overdue, status: 'OPEN' as const, priority: 'MEDIUM' as const },
        { ...mockTask, id: 'today_task', dueDate: today, status: 'OPEN' as const, priority: 'MEDIUM' as const },
        { ...mockTask, id: 'tomorrow_task', dueDate: tomorrow, status: 'OPEN' as const, priority: 'MEDIUM' as const },
        { ...mockTask, id: 'week_task', dueDate: nextWeek, status: 'OPEN' as const, priority: 'MEDIUM' as const },
        { ...mockTask, id: 'urgent_task', priority: 'URGENT' as const, status: 'OPEN' as const, dueDate: undefined },
      ];

      fileStorageService.searchFiles.mockResolvedValue(mockTasks);

      const result = await service.getDashboardAlerts();

      expect(result.overdue.count).toBe(1);
      expect(result.dueToday.count).toBe(1);
      expect(result.dueTomorrow.count).toBe(1);
      expect(result.dueThisWeek.count).toBe(3); // Only tasks with due dates within a week (excludes urgent task without due date)
      expect(result.urgent.count).toBe(1);
      expect(result.overdue.severity).toBe('critical');
    });
  });

  describe('getPriorityTaskRecommendations', () => {
    it('should return priority-scored task recommendations', async () => {
      const now = new Date();
      const overdue = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      const dueSoon = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      const mockTasks = [
        { ...mockTask, id: 'urgent_overdue', priority: 'URGENT' as const, dueDate: overdue, status: 'OPEN' as const },
        { ...mockTask, id: 'high_due_soon', priority: 'HIGH' as const, dueDate: dueSoon, status: 'IN_PROGRESS' as const },
        { ...mockTask, id: 'low_priority', priority: 'LOW' as const, status: 'OPEN' as const, dueDate: undefined },
      ];

      fileStorageService.searchFiles.mockResolvedValue(mockTasks);

      const result = await service.getPriorityTaskRecommendations();

      expect(result.topPriority).toHaveLength(3);
      // The urgent overdue task should have the highest score
      const urgentTask = result.topPriority.find(t => t.id === 'urgent_overdue');
      const highTask = result.topPriority.find(t => t.id === 'high_due_soon');
      const lowTask = result.topPriority.find(t => t.id === 'low_priority');
      
      expect(urgentTask).toBeDefined();
      expect(highTask).toBeDefined();
      expect(lowTask).toBeDefined();
      
      // Urgent overdue should have highest score
      expect(urgentTask!.priorityScore).toBeGreaterThan(highTask!.priorityScore);
      expect(highTask!.priorityScore).toBeGreaterThan(lowTask!.priorityScore);
      
      expect(result.recommendations.overdue).toBe(1);
      expect(result.recommendations.urgent).toBe(1);
      expect(result.recommendations.inProgress).toBe(1);
    });

    it('should filter by assignee when specified', async () => {
      const mockTasks = [
        { ...mockTask, id: 'task_1', assignee: 'john.doe', status: 'OPEN' as const },
        { ...mockTask, id: 'task_2', assignee: 'jane.doe', status: 'OPEN' as const },
      ];

      fileStorageService.searchFiles.mockResolvedValue(mockTasks);

      const result = await service.getPriorityTaskRecommendations('john.doe');

      expect(result.topPriority).toHaveLength(1);
      expect(result.topPriority[0].assignee).toBe('john.doe');
    });
  });

  describe('getComplianceDeadlines', () => {
    it('should return compliance-related deadlines', async () => {
      const now = new Date();
      const upcoming = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 days from now
      const overdue = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)); // 5 days ago

      const mockTasks = [
        { 
          ...mockTask, 
          id: 'compliance_upcoming', 
          dueDate: upcoming, 
          status: 'OPEN' as const,
          tags: ['compliance', 'filing'],
          priority: 'HIGH' as const
        },
        { 
          ...mockTask, 
          id: 'compliance_overdue', 
          dueDate: overdue, 
          status: 'OPEN' as const,
          tags: ['statutory', 'deadline'],
          priority: 'URGENT' as const
        },
        { 
          ...mockTask, 
          id: 'regular_task', 
          dueDate: upcoming, 
          status: 'OPEN' as const,
          tags: ['regular'],
          priority: 'MEDIUM' as const
        },
      ];

      fileStorageService.searchFiles.mockResolvedValue(mockTasks);

      const result = await service.getComplianceDeadlines();

      expect(result.upcoming).toHaveLength(1);
      expect(result.upcoming[0].id).toBe('compliance_upcoming');
      expect(result.overdue).toHaveLength(1);
      expect(result.overdue[0].id).toBe('compliance_overdue');
      expect(result.summary.totalUpcoming).toBe(1);
      expect(result.summary.totalOverdue).toBe(1);
      expect(result.summary.criticalCount).toBe(1); // One urgent overdue task
    });

    it('should handle errors gracefully', async () => {
      fileStorageService.searchFiles.mockRejectedValue(new Error('File system error'));

      const result = await service.getComplianceDeadlines();

      expect(result).toEqual({
        upcoming: [],
        overdue: [],
        summary: { totalUpcoming: 0, totalOverdue: 0, criticalCount: 0 },
      });
    });
  });
});
