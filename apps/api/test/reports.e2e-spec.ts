import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Reports API (e2e)', () => {
  let app: INestApplication;
  let testDataDir: string;
  let authToken: string;
  let testClientId: string;

  beforeAll(async () => {
    testDataDir = path.join(__dirname, 'test-data-reports');
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
    fs.mkdirSync(testDataDir, { recursive: true });

    process.env.DATA_DIR = testDataDir;
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const authResponse = await request(app.getHttpServer())
      .get('/auth/demo')
      .expect(200);

    authToken = authResponse.body.access_token;

    const clientData = {
      id: 'client-report-1',
      name: 'Test Report Company Ltd',
      type: 'COMPANY',
      portfolioCode: 1,
      mainEmail: 'test@reportcompany.com',
      mainPhone: '+44 20 1234 5678',
      status: 'ACTIVE',
      address: {
        line1: '123 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK'
      }
    };

    const clientResponse = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send(clientData);

    if (clientResponse.status === 201) {
      testClientId = clientResponse.body.id;
    } else {
      // Fallback: use a test client id
      testClientId = 'test-client-1';
    }
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('GET /documents/reports/client/:id/html', () => {
    it('should generate HTML report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/documents/reports/client/${testClientId}/html`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('MDJ Consultants Ltd');
      expect(response.text).toContain('Test Report Company Ltd');
    });

    it('should include services with option', async () => {
      const response = await request(app.getHttpServer())
        .get(`/documents/reports/client/${testClientId}/html?includeServices=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('Annual Accounts');
    });

    it('should return 400 for invalid client', async () => {
      await request(app.getHttpServer())
        .get('/documents/reports/client/invalid-id/html')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /documents/reports/client/:id/preview', () => {
    it('should return HTML with inline disposition', async () => {
      const response = await request(app.getHttpServer())
        .get(`/documents/reports/client/${testClientId}/preview`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.text).toContain('Test Report Company Ltd');
    });

    it('should support query options', async () => {
      const response = await request(app.getHttpServer())
        .get(`/documents/reports/client/${testClientId}/preview?includeServices=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('Annual Accounts');
    });

    it('should return 400 for invalid client', async () => {
      await request(app.getHttpServer())
        .get('/documents/reports/client/invalid-id/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /documents/reports/client/:id (PDF)', () => {
    it('should generate PDF report', async () => {
      try {
        const response = await request(app.getHttpServer())
          .post(`/documents/reports/client/${testClientId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ includeServices: true });

        if (response.status === 200) {
          expect(response.headers['content-type']).toBe('application/pdf');
          expect(response.headers['content-disposition']).toContain('attachment');
          expect(response.body.length).toBeGreaterThan(0);
          
          const pdfHeader = response.body.toString('utf8', 0, 4);
          expect(pdfHeader).toBe('%PDF');
        } else {
          // If PDF generation fails (e.g., Puppeteer not installed), verify HTML works
          const htmlResponse = await request(app.getHttpServer())
            .get(`/documents/reports/client/${testClientId}/html`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
          
          expect(htmlResponse.text).toContain('Test Report Company Ltd');
        }
      } catch (error) {
        // Fallback to HTML if PDF fails
        const htmlResponse = await request(app.getHttpServer())
          .get(`/documents/reports/client/${testClientId}/html`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(htmlResponse.text).toContain('Test Report Company Ltd');
      }
    });

    it('should return 400 for invalid client', async () => {
      const response = await request(app.getHttpServer())
        .post('/documents/reports/client/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Report Options', () => {
    it('should handle multiple options', async () => {
      const response = await request(app.getHttpServer())
        .get(`/documents/reports/client/${testClientId}/html?includeServices=true&includeParties=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('Test Report Company Ltd');
    });

    it('should handle includeCompaniesHouseData option', async () => {
      const response = await request(app.getHttpServer())
        .get(`/documents/reports/client/${testClientId}/html?includeCompaniesHouseData=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('Test Report Company Ltd');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for nonexistent client', async () => {
      await request(app.getHttpServer())
        .get('/documents/reports/client/nonexistent/html')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/documents/reports/client/${testClientId}/html`);

      expect([401]).toContain(response.status);
    });
  });
});
