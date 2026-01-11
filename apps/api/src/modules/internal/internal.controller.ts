import { Controller, Post, Headers, HttpCode, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import axios from 'axios';

@ApiTags('Internal')
@Controller('internal')
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  /**
   * Shutdown endpoint intended for native builds only.
   * If MDJ_SHUTDOWN_SECRET is configured, the request must include header x-mdj-shutdown.
   * Non-production environments allow no-secret for convenience.
   */
  @Post('shutdown')
  @HttpCode(200)
  async shutdown(@Headers('x-mdj-shutdown') secret?: string) {
    const configured = process.env.MDJ_SHUTDOWN_SECRET;

    if (configured && configured !== secret) {
      this.logger.warn('Unauthorized shutdown attempt');
      return { message: 'unauthorized' } as any;
    }

    // Try to request the web server shutdown endpoint first
    const webUrl = process.env.MDJ_WEB_URL || 'http://127.0.0.1:3000';
    const shutdownHeader = configured ? { 'x-mdj-shutdown': configured } : {};

    try {
      await axios.post(`${webUrl}/api/internal/shutdown`, {}, { headers: shutdownHeader, timeout: 2000 });
      this.logger.log('Requested web server shutdown');
    } catch (err) {
      this.logger.warn(`Failed to contact web shutdown endpoint: ${err?.message || err}`);
    }

    // Delay slightly to allow the HTTP response to be sent
    setTimeout(() => {
      this.logger.log('Exiting API process');
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    }, 500);

    return { message: 'shutting down' };
  }
}
