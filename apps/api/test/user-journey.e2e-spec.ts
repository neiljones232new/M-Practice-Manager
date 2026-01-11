import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Complete User Journey (e2e)', () => {
  let app: INestApplication;
  let testDataDir: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test data directory
    testDataDir = path.join(__dirname, 'test-data-journey');
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
  });

  afterAll(async () => {
    await app.close();
    
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('Authentication Flow', () => {
    it('should allow demo mode access', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/demo')
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      authToken = response.body.access_token;
    });

    it('should protect routes without authentication', async () => {
      await request(app.getHttpServer())
        .get('/clients')
        .expect(401);
    });

    it('should allow access with valid token', async () => {
      await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Client Management Workflow', () => {
    let clientRef: string;

    it('should create a new client', async () => {
      const clientData = {
        name: 'Test Company Ltd',
        type: 'COMPANY',
        portfolioCode: 1,
        mainEmail: 'test@company.com',
        mainPhone: '+44 20 1234 5678',
        address: {
          line1: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'UK'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body).toHaveProperty('ref');
      expect(response.body.name).toBe(clientData.name);
      expect(response.body.type).toBe(clientData.type);
      clientRef = response.body.ref;
    });

    it('should retrieve the created client', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clients/${clientRef}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.ref).toBe(clientRef);
      expect(response.body.name).toBe('Test Company Ltd');
    });

    it('should list clients', async () => {
      const response = await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(client => client.ref === clientRef)).toBe(true);
    });

    it('should update client information', async () => {
      const updateData = {
        mainEmail: 'updated@company.com',
        status: 'ACTIVE'
      };

      const response = await request(app.getHttpServer())
        .put(`/clients/${clientRef}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.mainEmail).toBe(updateData.mainEmail);
      expect(response.body.status).toBe(updateData.status);
    });
  });

  describe('Service Management Workflow', () => {
    let clientRef: string;
    let serviceId: string;

    beforeAll(async () => {
      // Create a client for service testing
      const clientData = {
        name: 'Service Test Company',
        type: 'COMPANY',
        portfolioCode: 1
      };

      const clientResponse = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData);

      clientRef = clientResponse.body.ref;
    });

    it('should create a service for a client', async () => {
      const serviceData = {
        clientRef,
        kind: 'Annual Accounts',
        frequency: 'ANNUAL',
        fee: 1200,
        description: 'Annual accounts preparation and filing'
      };

      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send(serviceData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.clientRef).toBe(clientRef);
      expect(response.body.kind).toBe(serviceData.kind);
      expect(response.body.annualized).toBe(1200);
      serviceId = response.body.id;
    });

    it('should retrieve services for a client', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services?clientRef=${clientRef}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(serviceId);
    });

    it('should update service information', async () => {
      const updateData = {
        fee: 1500,
        status: 'ACTIVE'
      };

      const response = await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.fee).toBe(updateData.fee);
      expect(response.body.annualized).toBe(1500);
      expect(response.body.status).toBe(updateData.status);
    });
  });

  describe('Task Management Workflow', () => {
    let clientRef: string;
    let taskId: string;

    beforeAll(async () => {
      // Create a client for task testing
      const clientData = {
        name: 'Task Test Company',
        type: 'COMPANY',
        portfolioCode: 1
      };

      const clientResponse = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData);

      clientRef = clientResponse.body.ref;
    });

    it('should create a task', async () => {
      const taskData = {
        clientRef,
        title: 'Prepare annual accounts',
        description: 'Prepare and review annual accounts for filing',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'HIGH',
        assignee: 'test-user'
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.priority).toBe(taskData.priority);
      taskId = response.body.id;
    });

    it('should retrieve tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some(task => task.id === taskId)).toBe(true);
    });

    it('should update task status', async () => {
      const updateData = {
        status: 'IN_PROGRESS'
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe(updateData.status);
    });

    it('should complete task workflow', async () => {
      const updateData = {
        status: 'COMPLETED'
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe(updateData.status);
    });
  });

  describe('Dashboard Integration', () => {
    it('should retrieve dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('kpis');
      expect(response.body).toHaveProperty('weekAhead');
      expect(response.body).toHaveProperty('overdue');
      expect(response.body.kpis).toHaveProperty('activeClients');
      expect(response.body.kpis).toHaveProperty('totalAnnualFees');
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain referential integrity', async () => {
      // Get all clients
      const clientsResponse = await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get all services
      const servicesResponse = await request(app.getHttpServer())
        .get('/services')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get all tasks
      const tasksResponse = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const clients = clientsResponse.body;
      const services = servicesResponse.body;
      const tasks = tasksResponse.body;

      // Verify all services reference valid clients
      for (const service of services) {
        const clientExists = clients.some(client => client.ref === service.clientRef);
        expect(clientExists).toBe(true);
      }

      // Verify all tasks reference valid clients
      for (const task of tasks) {
        if (task.clientRef) {
          const clientExists = clients.some(client => client.ref === task.clientRef);
          expect(clientExists).toBe(true);
        }
      }
    });

    it('should validate file system data integrity', async () => {
      // Check that data files exist and are valid JSON
      const clientsDir = path.join(testDataDir, 'clients');
      const servicesDir = path.join(testDataDir, 'services');
      const tasksDir = path.join(testDataDir, 'tasks');

      if (fs.existsSync(clientsDir)) {
        const clientFiles = fs.readdirSync(clientsDir).filter(f => f.endsWith('.json'));
        for (const file of clientFiles) {
          const content = fs.readFileSync(path.join(clientsDir, file), 'utf8');
          expect(() => JSON.parse(content)).not.toThrow();
        }
      }

      if (fs.existsSync(servicesDir)) {
        const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.json'));
        for (const file of serviceFiles) {
          const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
          expect(() => JSON.parse(content)).not.toThrow();
        }
      }

      if (fs.existsSync(tasksDir)) {
        const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
        for (const file of taskFiles) {
          const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
          expect(() => JSON.parse(content)).not.toThrow();
        }
      }
    });
  });
});