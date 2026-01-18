import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AssistService, AssistContext } from './assist.service';
import { ServerLifecycleService } from './server-lifecycle.service';

// ✅ validation + transform
import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/* =======================
   DTOs with validation
   ======================= */

class QueryDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsObject()
  context?: AssistContext;
}

class ClientSummaryDto {
  @IsString()
  clientRef!: string;
}

class DeadlineCheckDto {
  @IsOptional()
  @IsNumber()
  daysAhead?: number;
}

class PriorityTasksDto {
  @IsOptional()
  @IsString()
  userId?: string;
}

class BusinessInsightsDto {
  @IsOptional()
  @IsNumber()
  portfolioCode?: number;
}

class TemplateQueryDto {
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

class ContextualTemplatesDto {
  @IsOptional()
  @IsString()
  clientRef?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

// --- Chat payload DTOs (frontend-friendly) ---
class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role!: 'system' | 'user' | 'assistant';

  @IsString()
  content!: string;
}

class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsObject()
  context?: AssistContext;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;
}

@ApiTags('M Assist')
@Controller('assist')
export class AssistController {
  constructor(
    private readonly assistService: AssistService,
    private readonly serverLifecycleService: ServerLifecycleService,
  ) {}

  /* -----------------------
     Health / Status
     ----------------------- */

  @Get('health')
  @ApiOperation({ summary: 'Health check for M Assist' })
  health() {
    return { ok: true, service: 'assist', time: new Date().toISOString() };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get M Assist status' })
  getStatus() {
    return this.assistService.getStatus();
  }

  /* -----------------------
     Chat-style endpoint
     ----------------------- */

  @Post('chat')
  @ApiOperation({ summary: 'Chat-style endpoint (messages array) bridged to Assist' })
  @ApiBody({ type: ChatDto })
  async chat(@Body() body: ChatDto) {
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new BadRequestException('Body must include non-empty "messages" array.');
    }

    // Use the latest user message as the prompt for now
    const lastUser = [...body.messages].reverse().find((m) => m.role === 'user');
    if (!lastUser?.content?.trim()) {
      throw new BadRequestException('No user message found in "messages".');
    }

    const response = await this.assistService.processQuery(
      lastUser.content,
      body.context,
    );

    return {
      ok: true,
      response,
      usedPrompt: lastUser.content,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  /* -----------------------
     Query-style endpoints
     ----------------------- */

  @Post('query')
  @ApiOperation({ summary: 'Get AI assistance and insights' })
  @ApiBody({ type: QueryDto })
  async query(@Body() body: QueryDto) {
    const { prompt, context } = body;
    const response = await this.assistService.processQuery(prompt, context);

    return {
      query: prompt,
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  @Post('client-summary')
  @ApiOperation({ summary: 'Get comprehensive client summary' })
  @ApiBody({ type: ClientSummaryDto })
  async getClientSummary(@Body() body: ClientSummaryDto) {
    const response = await this.assistService.getClientSummary(body.clientRef);

    return {
      clientRef: body.clientRef,
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  @Post('check-deadlines')
  @ApiOperation({ summary: 'Check upcoming deadlines and overdue items' })
  @ApiBody({ type: DeadlineCheckDto })
  async checkDeadlines(@Body() body: DeadlineCheckDto) {
    const daysAhead = body.daysAhead || 30;
    const response = await this.assistService.checkDeadlines(daysAhead);

    return {
      daysAhead,
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  @Post('priority-tasks')
  @ApiOperation({ summary: 'Get priority task recommendations' })
  @ApiBody({ type: PriorityTasksDto })
  async getPriorityTasks(@Body() body: PriorityTasksDto) {
    const response = await this.assistService.getPriorityTasks(body.userId);

    return {
      userId: body.userId,
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  @Post('business-insights')
  @ApiOperation({ summary: 'Get business insights and recommendations' })
  @ApiBody({ type: BusinessInsightsDto })
  async getBusinessInsights(@Body() body: BusinessInsightsDto) {
    const response = await this.assistService.getBusinessInsights(body.portfolioCode);

    return {
      portfolioCode: body.portfolioCode,
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  /* -----------------------
     Server / lifecycle
     ----------------------- */

  @Get('server/status')
  @ApiOperation({ summary: 'Get server status and health' })
  async getServerStatus() {
    return this.serverLifecycleService.getServerStatus();
  }

  @Post('server/docker/start')
  @ApiOperation({ summary: 'Start Docker services' })
  async startDockerServices() {
    return this.serverLifecycleService.startDockerServices();
  }

  @Post('server/docker/stop')
  @ApiOperation({ summary: 'Stop Docker services' })
  async stopDockerServices() {
    return this.serverLifecycleService.stopDockerServices();
  }

  @Post('server/docker/restart')
  @ApiOperation({ summary: 'Restart Docker services' })
  async restartDockerServices() {
    return this.serverLifecycleService.restartDockerServices();
  }

  @Post('snapshot')
  @ApiOperation({ summary: 'Create data snapshot for offline mode' })
  async createSnapshot() {
    return this.serverLifecycleService.createSnapshot();
  }

  @Get('server/snapshot/load')
  @ApiOperation({ summary: 'Load data snapshot' })
  @ApiQuery({ name: 'path', required: false, description: 'Snapshot file path' })
  async loadSnapshot(@Query('path') snapshotPath?: string) {
    return this.serverLifecycleService.loadSnapshot(snapshotPath);
  }

  /* -----------------------
     Templates
     ----------------------- */

  @Get('templates')
  @ApiOperation({ summary: 'Get all query templates' })
  getQueryTemplates() {
    return {
      templates: this.assistService.getQueryTemplates(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('templates/category/:category')
  @ApiOperation({ summary: 'Get query templates by category' })
  @ApiParam({
    name: 'category',
    enum: ['client', 'deadline', 'task', 'business', 'compliance', 'general'],
  })
  getQueryTemplatesByCategory(@Param('category') category: string) {
    return {
      templates: this.assistService.getQueryTemplatesByCategory(category as any),
      category,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('quick-actions')
  @ApiOperation({ summary: 'Get quick action templates' })
  getQuickActions() {
    return {
      quickActions: this.assistService.getQuickActions(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('templates/search')
  @ApiOperation({ summary: 'Search query templates' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  searchQueryTemplates(@Query('q') query: string) {
    return {
      templates: this.assistService.searchQueryTemplates(query),
      query,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('templates/contextual')
  @ApiOperation({ summary: 'Get contextual template recommendations' })
  @ApiBody({ type: ContextualTemplatesDto })
  async getContextualTemplates(@Body() body: ContextualTemplatesDto) {
    const templates = await this.assistService.getContextualTemplates(body);

    return {
      templates,
      context: body,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('templates/execute')
  @ApiOperation({ summary: 'Execute a query template' })
  @ApiBody({ type: TemplateQueryDto })
  async executeTemplate(@Body() body: TemplateQueryDto) {
    const response = await this.assistService.processTemplateQuery(
      body.templateId,
      body.context,
    );

    return {
      templateId: body.templateId,
      context: body.context,
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  /* -----------------------
     Insights
     ----------------------- */

  @Post('insights/business')
  @ApiOperation({ summary: 'Get comprehensive business insights with recommendations' })
  async getBusinessInsightsWithRecommendations() {
    const response =
      await this.assistService.getBusinessInsightsWithRecommendations();

    return {
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }

  @Post('insights/client-risk')
  @ApiOperation({ summary: 'Get client risk assessment' })
  async getClientRiskAssessment() {
    const response = await this.assistService.getClientRiskAssessment();

    return {
      response,
      timestamp: new Date().toISOString(),
      mode: this.assistService.getStatus().mode,
    };
  }
}
