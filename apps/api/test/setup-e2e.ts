import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

export let app: INestApplication;
export let testDataDir: string;

beforeAll(async () => {
  // Create test data directory
  testDataDir = path.join(__dirname, 'test-data');
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