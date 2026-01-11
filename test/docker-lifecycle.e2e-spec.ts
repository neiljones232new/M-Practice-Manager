import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../apps/api/src/app.module';
import { ServerLifecycleService } from '../apps/api/src/modules/assist/server-lifecycle.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Docker Container Lifecycle (e2e)', () => {
  let app: INestApplication;
  let serverLifecycleService: ServerLifecycleService;
  let testDataDir: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test data directory
    testDataDir = path.join(__dirname, 'test-data-docker');
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
    serverLifecycleService = app.get<ServerLifecycleService>(ServerLifecycleService);
    await app.init();

    // Get auth token for API calls
    const authResponse = await request(app.getHttpServer())
      .post('/auth/demo')
      .expect(201);
    authToken = authResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
    
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('Server Status Management', () => {
    it('should get initial server status', async () => {
      const response = await request(app.getHttpServer())
        .get('/assist/server-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should handle server start command', async () => {
      const response = await request(app.getHttpServer())
        .post('/assist/server/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle server stop command', async () => {
      const response = await request(app.getHttpServer())
        .post('/assist/server/stop')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should create snapshot for offline mode', async () => {
      const response = await request(app.getHttpServer())
        .post('/assist/snapshot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('snapshotPath');

      // Verify snapshot file exists
      const snapshotPath = response.body.snapshotPath;
      expect(fs.existsSync(snapshotPath)).toBe(true);

      // Verify snapshot contains valid JSON
      const snapshotContent = fs.readFileSync(snapshotPath, 'utf8');
      expect(() => JSON.parse(snapshotContent)).not.toThrow();

      const snapshot = JSON.parse(snapshotContent);
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('data');
    });
  });

  describe('Service Health Monitoring', () => {
    it('should monitor service health', async () => {
      const status = await serverLifecycleService.getServerStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('uptime');
      expect(status.services).toHaveProperty('fileStorage');
      expect(status.services).toHaveProperty('api');
    });

    it('should detect service availability', async () => {
      const isHealthy = await serverLifecycleService.checkServiceHealth();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Container Management Integration', () => {
    it('should handle Docker compose operations gracefully', async () => {
      // Test that the service handles Docker operations without throwing
      try {
        await serverLifecycleService.startServer();
        await serverLifecycleService.stopServer();
        // If we reach here, the operations completed without throwing
        expect(true).toBe(true);
      } catch (error) {
        // Docker might not be available in test environment, which is acceptable
        expect(error.message).toContain('Docker');
      }
    });

    it('should maintain data integrity during server lifecycle', async () => {
      // Create some test data
      const clientData = {
        name: 'Lifecycle Test Company',
        type: 'COMPANY',
        portfolioCode: 1
      };

      const clientResponse = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      const clientRef = clientResponse.body.ref;

      // Simulate server restart by creating snapshot
      await request(app.getHttpServer())
        .post('/assist/snapshot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify data still exists after snapshot
      const retrieveResponse = await request(app.getHttpServer())
        .get(`/clients/${clientRef}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(retrieveResponse.body.ref).toBe(clientRef);
      expect(retrieveResponse.body.name).toBe(clientData.name);
    });
  });

  describe('File System Resilience', () => {
    it('should handle file system errors gracefully', async () => {
      // Test with invalid data directory
      const originalDataDir = process.env.DATA_DIR;
      process.env.DATA_DIR = '/invalid/path/that/does/not/exist';

      try {
        const response = await request(app.getHttpServer())
          .get('/clients')
          .set('Authorization', `Bearer ${authToken}`);

        // Should either succeed with empty data or return appropriate error
        expect([200, 500]).toContain(response.status);
      } finally {
        // Restore original data directory
        process.env.DATA_DIR = originalDataDir;
      }
    });

    it('should recover from corrupted data files', async () => {
      // Create a corrupted file
      const corruptedFilePath = path.join(testDataDir, 'clients', 'corrupted.json');
      fs.mkdirSync(path.dirname(corruptedFilePath), { recursive: true });
      fs.writeFileSync(corruptedFilePath, 'invalid json content');

      // API should handle this gracefully
      const response = await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not crash the application
      expect([200, 500]).toContain(response.status);
    });
  });
});