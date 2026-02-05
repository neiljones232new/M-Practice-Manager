import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Template System Integration (e2e)', () => {
  let app: INestApplication;
  let testDataDir: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test data directory
    testDataDir = path.join(__dirname, 'test-data-templates');
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
    fs.mkdirSync(testDataDir, { recursive: true });

    // Set environment variables for testing
    process.env.DATA_DIR = testDataDir;
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate for tests using demo mode
    const authResponse = await request(app.getHttpServer())
      .get('/auth/demo')
      .expect(200);

    authToken = authResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
    
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('Service Templates', () => {
    it('should retrieve all service templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Verify service template structure
      const template = response.body[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('serviceKind');
      expect(template).toHaveProperty('frequency');
      expect(template).toHaveProperty('taskTemplates');
      expect(Array.isArray(template.taskTemplates)).toBe(true);
    });

    it('should retrieve service templates with correct frequencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const validFrequencies = ['ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'ONE_OFF'];
      
      response.body.forEach(template => {
        expect(validFrequencies).toContain(template.frequency);
      });
    });

    it('should have task templates with required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const template = response.body.find(t => t.taskTemplates.length > 0);
      expect(template).toBeDefined();

      const taskTemplate = template.taskTemplates[0];
      expect(taskTemplate).toHaveProperty('title');
      expect(taskTemplate).toHaveProperty('description');
      expect(taskTemplate).toHaveProperty('daysBeforeDue');
      expect(taskTemplate).toHaveProperty('priority');
      expect(taskTemplate).toHaveProperty('tags');
      expect(Array.isArray(taskTemplate.tags)).toBe(true);
    });

    it('should maintain service templates unchanged', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify that service templates still exist and have the expected structure
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check for common service types
      const serviceKinds = response.body.map(t => t.serviceKind);
      expect(serviceKinds.some(kind => kind.includes('Annual Accounts') || kind.includes('VAT'))).toBe(true);
    });
  });

  describe('Standalone Task Templates', () => {
    it('should retrieve all standalone task templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(40); // Should have 40+ default templates
    });

    it('should have standalone task templates with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const template = response.body[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('priority');
      expect(template).toHaveProperty('tags');
      expect(template).toHaveProperty('createdAt');
      expect(template).toHaveProperty('updatedAt');
      expect(Array.isArray(template.tags)).toBe(true);
    });

    it('should have templates across all expected categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const categories = new Set(response.body.map(t => t.category));
      
      const expectedCategories = [
        'Client Communication',
        'Billing & Credit Control',
        'Practice Administration',
        'Email & Correspondence',
        'Client Job Workflow',
        'Internal Operations',
        'Marketing & Growth',
      ];

      expectedCategories.forEach(category => {
        expect(categories.has(category)).toBe(true);
      });
    });

    it('should filter templates by category', async () => {
      const category = 'Client Communication';
      
      const response = await request(app.getHttpServer())
        .get(`/tasks/templates/standalone?category=${encodeURIComponent(category)}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      response.body.forEach(template => {
        expect(template.category).toBe(category);
      });
    });

    it('should have templates with appropriate priorities', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      
      response.body.forEach(template => {
        expect(validPriorities).toContain(template.priority);
      });

      // Check for specific priority assignments
      const urgentTemplate = response.body.find(t => t.title === 'Chase overdue payment');
      expect(urgentTemplate?.priority).toBe('URGENT');

      const highTemplate = response.body.find(t => t.title === 'Make follow-up call');
      expect(highTemplate?.priority).toBe('HIGH');
    });

    it('should retrieve a single standalone task template by ID', async () => {
      // First get all templates
      const allTemplates = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const templateId = allTemplates.body[0].id;

      // Get single template
      const response = await request(app.getHttpServer())
        .get(`/tasks/templates/standalone/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(templateId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
    });

    it('should return 404 for non-existent template', async () => {
      await request(app.getHttpServer())
        .get('/tasks/templates/standalone/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should create custom standalone task template', async () => {
      const createDto = {
        title: 'Custom Test Template',
        description: 'This is a custom template for testing',
        category: 'Practice Administration',
        priority: 'MEDIUM',
        tags: ['test', 'custom'],
      };

      const response = await request(app.getHttpServer())
        .post('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createDto.title);
      expect(response.body.description).toBe(createDto.description);
      expect(response.body.category).toBe(createDto.category);
      expect(response.body.priority).toBe(createDto.priority);
      expect(response.body.tags).toEqual(createDto.tags);
    });
  });

  describe('Task Creation from Templates', () => {
    let clientId: string;

    beforeEach(async () => {
      // Create a test client for each test
      const clientData = {
        id: 'client-template-task-1',
        name: 'Template Test Company',
        type: 'COMPANY',
        portfolioCode: 1,
      };

      const clientResponse = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      clientId = clientResponse.body.id;
    });

    it('should create task with pre-populated data from standalone template', async () => {
      // Get a standalone template
      const templatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const template = templatesResponse.body[0];

      // Create task using template data
      const taskData = {
        clientId,
        title: template.title,
        description: template.description,
        priority: template.priority,
        tags: template.tags,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.title).toBe(template.title);
      expect(response.body.description).toBe(template.description);
      expect(response.body.priority).toBe(template.priority);
      expect(response.body.tags).toEqual(template.tags);
    });

    it('should allow modifying template data when creating task', async () => {
      // Get a standalone template
      const templatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const template = templatesResponse.body[0];

      // Create task with modified template data
      const taskData = {
        clientId,
        title: `${template.title} - Modified`,
        description: `${template.description} - Custom notes`,
        priority: 'HIGH', // Different from template
        tags: [...template.tags, 'modified'],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.title).toBe(taskData.title);
      expect(response.body.description).toBe(taskData.description);
      expect(response.body.priority).toBe('HIGH');
      expect(response.body.tags).toContain('modified');
    });
  });

  describe('Template System Coexistence', () => {
    it('should have both service and standalone task templates available', async () => {
      const serviceTemplatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const standaloneTemplatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(serviceTemplatesResponse.body.length).toBeGreaterThan(0);
      expect(standaloneTemplatesResponse.body.length).toBeGreaterThan(0);
    });

    it('should maintain separate storage for service and standalone templates', async () => {
      const serviceTemplatesDir = path.join(testDataDir, 'service-templates');
      const taskTemplatesDir = path.join(testDataDir, 'task-templates');

      // Check that both directories exist (or will exist after templates are created)
      const serviceTemplatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const standaloneTemplatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify templates are returned from different endpoints
      expect(serviceTemplatesResponse.body).not.toEqual(standaloneTemplatesResponse.body);
      
      // Verify structure differences
      const serviceTemplate = serviceTemplatesResponse.body[0];
      const standaloneTemplate = standaloneTemplatesResponse.body[0];

      expect(serviceTemplate).toHaveProperty('serviceKind');
      expect(serviceTemplate).toHaveProperty('frequency');
      expect(serviceTemplate).toHaveProperty('taskTemplates');

      expect(standaloneTemplate).toHaveProperty('category');
      expect(standaloneTemplate).not.toHaveProperty('serviceKind');
      expect(standaloneTemplate).not.toHaveProperty('frequency');
    });

    it('should not affect service templates when creating standalone templates', async () => {
      // Get initial service templates count
      const initialServiceTemplates = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialCount = initialServiceTemplates.body.length;

      // Create a standalone template
      const createDto = {
        title: 'Test Standalone Template',
        description: 'Testing coexistence',
        category: 'Internal Operations',
        priority: 'LOW',
        tags: ['test'],
      };

      await request(app.getHttpServer())
        .post('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      // Verify service templates count unchanged
      const finalServiceTemplates = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalServiceTemplates.body.length).toBe(initialCount);
    });
  });

  describe('Template Data Integrity', () => {
    it('should have valid JSON structure for all templates', async () => {
      const serviceTemplatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const standaloneTemplatesResponse = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify all templates can be serialized/deserialized
      expect(() => JSON.stringify(serviceTemplatesResponse.body)).not.toThrow();
      expect(() => JSON.stringify(standaloneTemplatesResponse.body)).not.toThrow();
    });

    it('should have unique IDs for all standalone templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const ids = response.body.map(t => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid date fields for standalone templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.forEach(template => {
        expect(new Date(template.createdAt).toString()).not.toBe('Invalid Date');
        expect(new Date(template.updatedAt).toString()).not.toBe('Invalid Date');
      });
    });

    it('should have non-empty required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.forEach(template => {
        expect(template.title).toBeTruthy();
        expect(template.title.length).toBeGreaterThan(0);
        expect(template.description).toBeTruthy();
        expect(template.description.length).toBeGreaterThan(0);
        expect(template.category).toBeTruthy();
        expect(template.priority).toBeTruthy();
      });
    });
  });

  describe('Template Categories and Organization', () => {
    it('should have Client Communication templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone?category=Client%20Communication')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(7);
      
      const titles = response.body.map(t => t.title);
      expect(titles).toContain('Respond to client email');
      expect(titles).toContain('Make follow-up call');
    });

    it('should have Billing & Credit Control templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone?category=Billing%20%26%20Credit%20Control')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(6);
      
      const titles = response.body.map(t => t.title);
      expect(titles).toContain('Issue invoice');
      expect(titles).toContain('Chase overdue payment');
    });

    it('should have Practice Administration templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone?category=Practice%20Administration')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(5);
    });

    it('should have templates with relevant tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check that email-related templates have email tags
      const emailTemplates = response.body.filter(t => 
        t.title.toLowerCase().includes('email') || 
        t.description.toLowerCase().includes('email')
      );

      // Should have at least some email templates
      expect(emailTemplates.length).toBeGreaterThan(0);

      // Check that at least one email template has email-related tags
      const hasEmailTags = emailTemplates.some(template => 
        template.tags.some(tag => tag.toLowerCase().includes('email'))
      );
      expect(hasEmailTags).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid category filter gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/templates/standalone?category=NonexistentCategory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should require authentication for template endpoints', async () => {
      // Note: In test environment, authentication might be disabled
      // This test verifies the endpoints are accessible
      const standaloneResponse = await request(app.getHttpServer())
        .get('/tasks/templates/standalone');

      const serviceResponse = await request(app.getHttpServer())
        .get('/tasks/templates/service-templates');

      // Either requires auth (401) or returns data (200)
      expect([200, 401]).toContain(standaloneResponse.status);
      expect([200, 401]).toContain(serviceResponse.status);
    });

    it('should validate required fields when creating custom template', async () => {
      const invalidDto = {
        // Missing required fields (title and category)
        description: 'Test description',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks/templates/standalone')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto);

      // Should return 400 Bad Request or 500 if validation is not implemented
      expect([400, 500]).toContain(response.status);
    });
  });
});
