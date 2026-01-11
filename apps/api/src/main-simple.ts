import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';

// Simple Express app for basic API functionality
const app = express();
const port = 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Demo auth endpoint
app.post('/auth/demo', (req, res) => {
  res.json({
    access_token: 'demo-token-' + Date.now(),
    user: {
      id: 'demo-user',
      email: 'demo@mdj.com',
      name: 'Demo User',
      role: 'admin'
    }
  });
});

// Basic endpoints
app.get('/clients', (req, res) => {
  res.json([
    {
      id: '1',
      ref: 'CLI001',
      name: 'ABC Limited',
      type: 'COMPANY',
      status: 'ACTIVE',
      portfolioCode: 1,
      mainEmail: 'contact@abc.com',
      createdAt: new Date().toISOString()
    },
    {
      id: '2', 
      ref: 'CLI002',
      name: 'XYZ Partnership',
      type: 'PARTNERSHIP',
      status: 'ACTIVE',
      portfolioCode: 2,
      mainEmail: 'info@xyz.com',
      createdAt: new Date().toISOString()
    }
  ]);
});

app.get('/dashboard', (req, res) => {
  res.json({
    kpis: {
      activeClients: 24,
      totalAnnualFees: 125000,
      activeServices: 45,
      overdueTasks: 3
    },
    weekAhead: [
      {
        id: '1',
        title: 'VAT Return Due - ABC Ltd',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'HIGH'
      }
    ],
    overdue: [
      {
        id: '2',
        title: 'Annual Accounts - XYZ Ltd',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'URGENT'
      }
    ]
  });
});

app.get('/tasks', (req, res) => {
  res.json([
    {
      id: '1',
      title: 'Prepare VAT Return',
      description: 'Quarterly VAT return for ABC Ltd',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      clientRef: 'CLI001'
    }
  ]);
});

app.get('/services', (req, res) => {
  res.json([
    {
      id: '1',
      clientRef: 'CLI001',
      kind: 'Annual Accounts',
      frequency: 'ANNUAL',
      fee: 1200,
      annualized: 1200,
      status: 'ACTIVE'
    }
  ]);
});

// Catch all
app.get('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`🚀 Simple API server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});