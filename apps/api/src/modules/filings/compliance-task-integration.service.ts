import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComplianceService } from './compliance.service';
import { FileStorageService } from '../file-storage/file-storage.service';

@Injectable()
export class ComplianceTaskIntegrationService {
  private readonly logger = new Logger(ComplianceTaskIntegrationService.name);

  constructor(
    private readonly complianceService: ComplianceService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Scheduled job to automatically create tasks for upcoming compliance deadlines
   * Runs daily at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async autoCreateComplianceTasks(): Promise<void> {
    try {
      this.logger.log('Starting automatic compliance task creation');

      // Create tasks for items due in the next 30 days
      const upcomingTaskIds = await this.complianceService.createTasksForUpcomingCompliance(30);
      
      // Create tasks for overdue items
      const overdueTaskIds = await this.complianceService.createTasksForOverdueCompliance();

      // Escalate overdue compliance items
      const escalationResult = await this.complianceService.escalateOverdueCompliance();

      this.logger.log(`Automatic compliance task creation completed:
        - Created ${upcomingTaskIds.length} tasks for upcoming compliance
        - Created ${overdueTaskIds.length} tasks for overdue compliance
        - Escalated ${escalationResult.escalated} overdue items
        - Created ${escalationResult.tasksCreated} escalation tasks`);

    } catch (error) {
      this.logger.error('Error in automatic compliance task creation:', error);
    }
  }

  /**
   * Scheduled job to check for overdue compliance items and escalate priority
   * Runs every hour during business hours (9 AM - 6 PM)
   */
  @Cron('0 9-18 * * 1-5') // Every hour from 9 AM to 6 PM, Monday to Friday
  async checkOverdueCompliance(): Promise<void> {
    try {
      this.logger.log('Checking for overdue compliance items');

      const overdueItems = await this.complianceService.getOverdueComplianceItems();
      
      if (overdueItems.length > 0) {
        this.logger.warn(`Found ${overdueItems.length} overdue compliance items`);
        
        // Escalate priority for related tasks
        for (const item of overdueItems) {
          const relatedTasks = await this.complianceService.findTasksForComplianceItem(item.id);
          
          for (const task of relatedTasks) {
            if (task.status === 'OPEN' || task.status === 'IN_PROGRESS') {
              if (task.priority !== 'URGENT') {
                const updatedTask = {
                  ...task,
                  priority: 'URGENT',
                  tags: [...(task.tags || []), 'escalated', 'overdue-compliance'],
                  updatedAt: new Date(),
                };
                
                await this.fileStorageService.writeJson('tasks', task.id, updatedTask);
                this.logger.log(`Escalated task ${task.id} to URGENT priority due to overdue compliance`);
              }
            }
          }
        }
      }

    } catch (error) {
      this.logger.error('Error checking overdue compliance:', error);
    }
  }

  /**
   * Create tasks for compliance items that are due within a specific timeframe
   */
  async createTasksForComplianceDeadlines(
    daysAhead: number = 30,
    assignee?: string,
    portfolioCode?: number,
  ): Promise<{
    created: number;
    skipped: number;
    errors: number;
  }> {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const upcomingItems = await this.complianceService.getUpcomingComplianceItems(daysAhead);
      
      for (const item of upcomingItems) {
        try {
          // Skip if portfolio filter is specified and doesn't match
          if (portfolioCode) {
            // We would need to get client info to check portfolio
            // For now, we'll skip this filter
          }

          // Check if task already exists
          const existingTasks = await this.complianceService.findTasksForComplianceItem(item.id);
          
          if (existingTasks.length > 0) {
            skipped++;
            continue;
          }

          // Create task
          await this.complianceService.createTaskFromComplianceItem(item.id, assignee);
          created++;

        } catch (error) {
          this.logger.error(`Error creating task for compliance item ${item.id}:`, error);
          errors++;
        }
      }

      this.logger.log(`Compliance task creation summary: ${created} created, ${skipped} skipped, ${errors} errors`);

    } catch (error) {
      this.logger.error('Error in createTasksForComplianceDeadlines:', error);
      errors++;
    }

    return { created, skipped, errors };
  }

  /**
   * Get compliance dashboard data with task integration
   */
  async getComplianceDashboardData(): Promise<{
    summary: any;
    overdueWithTasks: any[];
    upcomingWithTasks: any[];
    taskRelationships: any[];
  }> {
    try {
      // Get basic compliance summary
      const summary = await this.complianceService.getComplianceStatistics();
      
      // Get overdue items with their related tasks
      const overdueItems = await this.complianceService.getOverdueComplianceItems();
      const overdueWithTasks = [];
      
      for (const item of overdueItems) {
        const relatedTasks = await this.complianceService.findTasksForComplianceItem(item.id);
        overdueWithTasks.push({
          ...item,
          relatedTasks: relatedTasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
          })),
        });
      }

      // Get upcoming items with their related tasks
      const upcomingItems = await this.complianceService.getUpcomingComplianceItems(30);
      const upcomingWithTasks = [];
      
      for (const item of upcomingItems) {
        const relatedTasks = await this.complianceService.findTasksForComplianceItem(item.id);
        upcomingWithTasks.push({
          ...item,
          relatedTasks: relatedTasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
          })),
        });
      }

      // Get all task relationships
      const taskRelationships = await this.complianceService.getComplianceTaskRelationships();

      return {
        summary,
        overdueWithTasks,
        upcomingWithTasks,
        taskRelationships,
      };

    } catch (error) {
      this.logger.error('Error getting compliance dashboard data:', error);
      throw error;
    }
  }

  /**
   * Sync compliance status with related task status
   */
  async syncComplianceWithTasks(): Promise<{
    synced: number;
    errors: number;
  }> {
    let synced = 0;
    let errors = 0;

    try {
      const allItems = await this.complianceService.getAllComplianceItems();
      
      for (const item of allItems) {
        try {
          const relatedTasks = await this.complianceService.findTasksForComplianceItem(item.id);
          
          // If all related tasks are completed and compliance is still pending, mark as filed
          if (relatedTasks.length > 0) {
            const allTasksCompleted = relatedTasks.every(task => task.status === 'COMPLETED');
            
            if (allTasksCompleted && item.status === 'PENDING') {
              await this.complianceService.markComplianceItemFiled(item.id);
              synced++;
              this.logger.log(`Marked compliance item ${item.id} as filed based on completed tasks`);
            }
          }

        } catch (error) {
          this.logger.error(`Error syncing compliance item ${item.id}:`, error);
          errors++;
        }
      }

      this.logger.log(`Compliance sync completed: ${synced} synced, ${errors} errors`);

    } catch (error) {
      this.logger.error('Error in syncComplianceWithTasks:', error);
      errors++;
    }

    return { synced, errors };
  }

  /**
   * Get priority recommendations based on compliance deadlines and task status
   */
  async getPriorityRecommendations(): Promise<{
    criticalItems: any[];
    recommendations: string[];
    actionItems: any[];
  }> {
    try {
      const overdueItems = await this.complianceService.getOverdueComplianceItems();
      const upcomingItems = await this.complianceService.getUpcomingComplianceItems(7); // Next 7 days
      
      const criticalItems = [];
      const recommendations = [];
      const actionItems = [];

      // Process overdue items
      for (const item of overdueItems) {
        const relatedTasks = await this.complianceService.findTasksForComplianceItem(item.id);
        const hasActiveTasks = relatedTasks.some(task => 
          task.status === 'OPEN' || task.status === 'IN_PROGRESS'
        );

        criticalItems.push({
          ...item,
          severity: 'critical',
          hasActiveTasks,
          relatedTaskCount: relatedTasks.length,
        });

        if (!hasActiveTasks) {
          recommendations.push(`Create urgent task for overdue ${item.type}: ${item.description}`);
          actionItems.push({
            type: 'create_task',
            complianceId: item.id,
            priority: 'URGENT',
            reason: 'Overdue compliance item without active tasks',
          });
        }
      }

      // Process upcoming items
      for (const item of upcomingItems) {
        const relatedTasks = await this.complianceService.findTasksForComplianceItem(item.id);
        const hasActiveTasks = relatedTasks.some(task => 
          task.status === 'OPEN' || task.status === 'IN_PROGRESS'
        );

        if (!hasActiveTasks) {
          const daysUntilDue = item.dueDate 
            ? Math.ceil((new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : null;

          if (daysUntilDue && daysUntilDue <= 7) {
            criticalItems.push({
              ...item,
              severity: 'high',
              hasActiveTasks,
              relatedTaskCount: relatedTasks.length,
              daysUntilDue,
            });

            recommendations.push(`Create high-priority task for ${item.type} due in ${daysUntilDue} days`);
            actionItems.push({
              type: 'create_task',
              complianceId: item.id,
              priority: 'HIGH',
              reason: `Due in ${daysUntilDue} days without active tasks`,
            });
          }
        }
      }

      return {
        criticalItems: criticalItems.sort((a, b) => {
          if (a.severity === 'critical' && b.severity !== 'critical') return -1;
          if (a.severity !== 'critical' && b.severity === 'critical') return 1;
          return 0;
        }),
        recommendations,
        actionItems,
      };

    } catch (error) {
      this.logger.error('Error getting priority recommendations:', error);
      throw error;
    }
  }
}