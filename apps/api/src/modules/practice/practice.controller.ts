import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { PracticeService } from './practice.service';
import { requireContext } from '../../common/http/request-context';
import {
  CreateFirmClientDto,
  CreateComplianceTaskDto,
  CreateDocumentRequestDto,
  TaskStatus,
  DocumentRequestStatus,
} from '@platform/shared-types';

@Controller('v1/practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  private getContext(req: any) {
    return requireContext(req);
  }

  // Clients
  @Get('clients')
  async listClients(@Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.listClients(tenantId);
  }

  @Post('clients')
  async createClient(@Body() dto: CreateFirmClientDto, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.createClient(tenantId, dto);
  }

  // Tasks
  @Get('tasks')
  async listTasks(
    @Query('clientId') clientId: string,
    @Query('status') status: string,
    @Query('category') category: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.listTasks(tenantId, {
      clientId,
      status,
      category,
    });
  }

  @Post('tasks')
  async createTask(@Body() dto: CreateComplianceTaskDto, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.createTask(tenantId, dto);
  }

  @Patch('tasks/:id/status')
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() body: { status: TaskStatus; filingAcknowledgmentNumber?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.updateTaskStatus(
      tenantId,
      id,
      body.status,
      body.filingAcknowledgmentNumber,
    );
  }

  @Post('tasks/:id/comments')
  async addTaskComment(
    @Param('id') id: string,
    @Body() body: { comment: string; isInternalOnly?: boolean },
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.practiceService.addTaskComment(
      tenantId,
      id,
      userId,
      body.comment,
      body.isInternalOnly,
    );
  }

  // Client Documents Portal
  @Get('documents')
  async listDocuments(@Query('clientId') clientId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.listDocumentRequests(tenantId, clientId);
  }

  @Post('documents')
  async createDocumentRequest(
    @Body() dto: CreateDocumentRequestDto,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.createDocumentRequest(tenantId, dto);
  }

  @Post('documents/:id/upload')
  async uploadDocument(
    @Param('id') id: string,
    @Body() body: { fileName: string; fileSizeBytes: number; fileUrl: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.uploadClientDocument(
      tenantId,
      id,
      body.fileName,
      body.fileSizeBytes,
      body.fileUrl,
    );
  }

  @Post('documents/:id/review')
  async reviewDocument(
    @Param('id') id: string,
    @Body() body: { status: DocumentRequestStatus.ACCEPTED | DocumentRequestStatus.REJECTED; rejectionReason?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.reviewClientDocument(
      tenantId,
      id,
      body.status,
      body.rejectionReason,
    );
  }

  // Statutory Compliance Calendar
  @Get('calendar')
  async getCalendar(@Query('month') month: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.practiceService.getComplianceCalendar(tenantId, month);
  }
}

