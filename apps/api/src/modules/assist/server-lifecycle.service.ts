import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export interface ServerStatus {
  isOnline: boolean;
  mode: 'native' | 'docker' | 'hybrid';
  services: {
    api: {
      status: 'running' | 'stopped' | 'error';
      port?: number;
      pid?: number;
    };
    database?: {
      status: 'running' | 'stopped' | 'error';
      container?: string;
      port?: number;
    };
    redis?: {
      status: 'running' | 'stopped' | 'error';
      container?: string;
      port?: number;
    };
  };
  lastSnapshot?: Date;
  uptime?: number;
}

@Injectable()
export class ServerLifecycleService {
  private readonly logger = new Logger(ServerLifecycleService.name);
  private readonly storagePath: string;
  private readonly dockerComposePath: string;
  private readonly dockerComposeArgs: string[];
  private processes: Map<string, ChildProcess> = new Map();
  private startTime: Date = new Date();

  constructor(private configService: ConfigService) {
    this.storagePath = this.configService.get<string>('STORAGE_PATH') || './mdj-data';
    const cwd = process.cwd();
    const repoRoot = cwd.endsWith(path.join('apps', 'api')) ? path.resolve(cwd, '..', '..') : cwd;
    const composeCandidates = [
      path.join(repoRoot, 'docker-compose.yml'),
      path.join(repoRoot, 'docker-compose.prod.yml'),
    ];
    this.dockerComposePath = composeCandidates.find((candidate) => existsSync(candidate)) ?? composeCandidates[0];
    this.dockerComposeArgs = ['-f', this.dockerComposePath];
  }

  async getServerStatus(): Promise<ServerStatus> {
    const status: ServerStatus = {
      isOnline: true,
      mode: 'native',
      services: {
        api: {
          status: 'running',
          port: this.configService.get<number>('PORT') || 3001,
          pid: process.pid,
        },
      },
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };

    // Check for Docker services if docker-compose.yml exists
    if (existsSync(this.dockerComposePath)) {
      status.mode = 'hybrid';
      
      try {
        // Check PostgreSQL container
        const pgStatus = await this.checkDockerContainer('postgres');
        if (pgStatus) {
          status.services.database = {
            status: pgStatus.running ? 'running' : 'stopped',
            container: pgStatus.name,
            port: 5432,
          };
        }

        // Check Redis container
        const redisStatus = await this.checkDockerContainer('redis');
        if (redisStatus) {
          status.services.redis = {
            status: redisStatus.running ? 'running' : 'stopped',
            container: redisStatus.name,
            port: 6379,
          };
        }
      } catch (error) {
        this.logger.warn('Error checking Docker containers:', error);
      }
    }

    // Check for last snapshot
    try {
      const snapshotPath = path.join(this.storagePath, 'snapshots', 'latest.json');
      if (existsSync(snapshotPath)) {
        const stats = await fs.stat(snapshotPath);
        status.lastSnapshot = stats.mtime;
      }
    } catch (error) {
      this.logger.debug('No snapshot found');
    }

    return status;
  }

  async startDockerServices(): Promise<{ success: boolean; message: string }> {
    if (!existsSync(this.dockerComposePath)) {
      return {
        success: false,
        message: 'Docker Compose file not found. Docker services are not configured.',
      };
    }

    try {
      this.logger.log('Starting Docker services...');
      
      const { stdout, stderr } = await execAsync(`docker-compose ${this.dockerComposeArgs.join(' ')} up -d`, {
        cwd: process.cwd(),
        timeout: 60000, // 60 second timeout
      });

      if (stderr && !stderr.includes('Creating') && !stderr.includes('Starting')) {
        this.logger.error('Docker Compose stderr:', stderr);
        return {
          success: false,
          message: `Error starting Docker services: ${stderr}`,
        };
      }

      this.logger.log('Docker services started successfully');
      return {
        success: true,
        message: 'Docker services started successfully',
      };
    } catch (error) {
      this.logger.error('Error starting Docker services:', error);
      return {
        success: false,
        message: `Failed to start Docker services: ${error.message}`,
      };
    }
  }

  async stopDockerServices(): Promise<{ success: boolean; message: string }> {
    if (!existsSync(this.dockerComposePath)) {
      return {
        success: false,
        message: 'Docker Compose file not found. Docker services are not configured.',
      };
    }

    try {
      this.logger.log('Stopping Docker services...');
      
      const { stdout, stderr } = await execAsync(`docker-compose ${this.dockerComposeArgs.join(' ')} down`, {
        cwd: process.cwd(),
        timeout: 30000, // 30 second timeout
      });

      if (stderr && !stderr.includes('Stopping') && !stderr.includes('Removing')) {
        this.logger.error('Docker Compose stderr:', stderr);
        return {
          success: false,
          message: `Error stopping Docker services: ${stderr}`,
        };
      }

      this.logger.log('Docker services stopped successfully');
      return {
        success: true,
        message: 'Docker services stopped successfully',
      };
    } catch (error) {
      this.logger.error('Error stopping Docker services:', error);
      return {
        success: false,
        message: `Failed to stop Docker services: ${error.message}`,
      };
    }
  }

  async restartDockerServices(): Promise<{ success: boolean; message: string }> {
    const stopResult = await this.stopDockerServices();
    if (!stopResult.success) {
      return stopResult;
    }

    // Wait a moment before starting
    await new Promise(resolve => setTimeout(resolve, 2000));

    return this.startDockerServices();
  }

  async createSnapshot(): Promise<{ success: boolean; message: string; path?: string }> {
    try {
      const snapshotDir = path.join(this.storagePath, 'snapshots');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotPath = path.join(snapshotDir, `snapshot-${timestamp}.json`);
      const latestPath = path.join(snapshotDir, 'latest.json');

      // Ensure snapshots directory exists
      await fs.mkdir(snapshotDir, { recursive: true });

      // Collect data from various sources
      const snapshot = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        serverStatus: await this.getServerStatus(),
        data: {
          clients: await this.readDataFiles('clients'),
          services: await this.readDataFiles('services'),
          tasks: await this.readDataFiles('tasks'),
          compliance: await this.readDataFiles('compliance'),
          calendar: await this.readDataFiles('calendar'),
        },
      };

      // Write snapshot
      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
      await fs.writeFile(latestPath, JSON.stringify(snapshot, null, 2));

      this.logger.log(`Snapshot created: ${snapshotPath}`);
      
      // Clean up old snapshots (keep last 10)
      await this.cleanupOldSnapshots(snapshotDir);

      return {
        success: true,
        message: 'Snapshot created successfully',
        path: snapshotPath,
      };
    } catch (error) {
      this.logger.error('Error creating snapshot:', error);
      return {
        success: false,
        message: `Failed to create snapshot: ${error.message}`,
      };
    }
  }

  async loadSnapshot(snapshotPath?: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const targetPath = snapshotPath || path.join(this.storagePath, 'snapshots', 'latest.json');
      
      if (!existsSync(targetPath)) {
        return {
          success: false,
          message: 'Snapshot file not found',
        };
      }

      const snapshotData = await fs.readFile(targetPath, 'utf-8');
      const snapshot = JSON.parse(snapshotData);

      this.logger.log(`Snapshot loaded from: ${targetPath}`);
      
      return {
        success: true,
        message: 'Snapshot loaded successfully',
        data: snapshot,
      };
    } catch (error) {
      this.logger.error('Error loading snapshot:', error);
      return {
        success: false,
        message: `Failed to load snapshot: ${error.message}`,
      };
    }
  }

  private async checkDockerContainer(serviceName: string): Promise<{ name: string; running: boolean } | null> {
    try {
      const { stdout } = await execAsync(`docker-compose ps -q ${serviceName}`, {
        cwd: process.cwd(),
      });

      if (!stdout.trim()) {
        return null;
      }

      const containerId = stdout.trim();
      const { stdout: inspectOutput } = await execAsync(`docker inspect ${containerId} --format='{{.Name}},{{.State.Running}}'`);
      
      const [name, running] = inspectOutput.trim().split(',');
      
      return {
        name: name.replace('/', ''),
        running: running === 'true',
      };
    } catch (error) {
      return null;
    }
  }

  private async readDataFiles(category: string): Promise<any[]> {
    try {
      const categoryPath = path.join(this.storagePath, category);
      
      if (!existsSync(categoryPath)) {
        return [];
      }

      const files = await fs.readdir(categoryPath);
      const dataFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
      
      const data = [];
      for (const file of dataFiles) {
        try {
          const filePath = path.join(categoryPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          data.push(JSON.parse(content));
        } catch (error) {
          this.logger.warn(`Error reading file ${file}:`, error);
        }
      }
      
      return data;
    } catch (error) {
      this.logger.warn(`Error reading data files for category ${category}:`, error);
      return [];
    }
  }

  private async cleanupOldSnapshots(snapshotDir: string): Promise<void> {
    try {
      const files = await fs.readdir(snapshotDir);
      const snapshotFiles = files
        .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(snapshotDir, f),
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name (timestamp) descending

      // Keep only the latest 10 snapshots
      const filesToDelete = snapshotFiles.slice(10);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        this.logger.debug(`Deleted old snapshot: ${file.name}`);
      }
    } catch (error) {
      this.logger.warn('Error cleaning up old snapshots:', error);
    }
  }
}
