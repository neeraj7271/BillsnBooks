import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PracticeService } from './practice.service';
import { DocumentVaultService } from './document-vault.service';
import { PracticeWorkflowService } from './practice-workflow.service';
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
  constructor(
    private readonly practiceService: PracticeService,
    private readonly vaultService: DocumentVaultService,
    private readonly workflowService: PracticeWorkflowService,
  ) {}

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
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.vaultService.uploadToRequest(tenantId, userId, id, file);
  }

  @Get('documents/:id/download')
  async downloadRequestDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { tenantId, userId, role } = this.getContext(req);
    const result = await this.vaultService.downloadByRequestId(tenantId, userId, role, id);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
    res.setHeader('X-Content-SHA256', result.sha256);
    return res.send(result.body);
  }

  // Client Document Vault
  @Get('vault/clients/:clientId')
  async getClientVault(
    @Param('clientId') clientId: string,
    @Query('folderId') folderId: string,
    @Query('q') q: string,
    @Request() req: any,
  ) {
    const { tenantId, userId, role } = this.getContext(req);
    return await this.vaultService.getClientVault(tenantId, clientId, userId, role, { folderId, q });
  }

  @Get('vault/files')
  async listAllVaultFiles(
    @Query('clientId') clientId: string,
    @Query('folderName') folderName: string,
    @Query('q') q: string,
    @Request() req: any,
  ) {
    const { tenantId, userId, role } = this.getContext(req);
    return await this.vaultService.listAllVaultFiles(tenantId, userId, role, { clientId, folderName, q });
  }

  @Post('vault/clients/:clientId/folders')
  async createVaultFolder(
    @Param('clientId') clientId: string,
    @Body() body: { name: string; parentId?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.vaultService.createFolder(tenantId, clientId, body.name, body.parentId);
  }

  @Patch('vault/folders/:folderId')
  async renameVaultFolder(
    @Param('folderId') folderId: string,
    @Body() body: { name: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.vaultService.renameFolder(tenantId, folderId, body.name);
  }

  @Post('vault/clients/:clientId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadToVault(
    @Param('clientId') clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folderId?: string; replaceFileGroupId?: string },
    @Request() req: any,
  ) {
    const { tenantId, userId, role } = this.getContext(req);
    return await this.vaultService.uploadToVault(tenantId, userId, role, clientId, file, {
      folderId: body?.folderId || undefined,
      replaceFileGroupId: body?.replaceFileGroupId || undefined,
    });
  }

  @Get('documents/files/:fileId/download')
  async downloadVaultFile(
    @Param('fileId') fileId: string,
    @Query('inline') inline: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { tenantId, userId, role } = this.getContext(req);
    const isInline = inline === '1' || inline === 'true';
    const result = await this.vaultService.downloadFile(
      tenantId,
      userId,
      role,
      fileId,
      isInline ? 'view' : 'download',
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `${isInline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(result.fileName)}"`,
    );
    res.setHeader('X-Content-SHA256', result.sha256);
    return res.send(result.body);
  }

  @Get('documents/files/:fileId/versions')
  async listFileVersions(@Param('fileId') fileId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.vaultService.listVersions(tenantId, fileId);
  }

  @Post('documents/files/:fileId/restore')
  async restoreFileVersion(@Param('fileId') fileId: string, @Request() req: any) {
    const { tenantId, userId } = this.getContext(req);
    return await this.vaultService.restoreVersion(tenantId, userId, fileId);
  }

  @Patch('documents/files/:fileId')
  async updateVaultFile(
    @Param('fileId') fileId: string,
    @Body() body: { fileName?: string; folderId?: string | null },
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.vaultService.updateFileMeta(tenantId, userId, fileId, body);
  }

  @Get('documents/files/:fileId/audit')
  async getFileAudit(@Param('fileId') fileId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.vaultService.getAuditTrail(tenantId, fileId);
  }

  @Delete('documents/files/:fileId')
  async deleteVaultFile(@Param('fileId') fileId: string, @Request() req: any) {
    const { tenantId, userId } = this.getContext(req);
    return await this.vaultService.softDeleteFile(tenantId, userId, fileId);
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

  // ==========================================
  // JOBS, WORKFLOW TEMPLATES, CLIENT 360, WORKLOAD, DASHBOARD
  // ==========================================

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.getPracticeDashboard(tenantId);
  }

  @Get('workload')
  async getWorkload(@Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.getStaffWorkload(tenantId);
  }

  @Get('workflow-templates')
  async listTemplates(@Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.listTemplates(tenantId);
  }

  @Get('jobs')
  async listJobs(
    @Query('clientId') clientId: string,
    @Query('stage') stage: string,
    @Query('assignedToUserId') assignedToUserId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.listJobs(tenantId, { clientId, stage, assignedToUserId });
  }

  @Post('jobs')
  async createJob(@Body() body: any, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.createJob(tenantId, body);
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.getJob(tenantId, jobId);
  }

  @Patch('jobs/:jobId/stage')
  async moveJobStage(
    @Param('jobId') jobId: string,
    @Body() body: { stage: string; filingAckNumber?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.moveJobStage(tenantId, jobId, body.stage, body.filingAckNumber);
  }

  @Patch('jobs/:jobId/assign')
  async assignJob(
    @Param('jobId') jobId: string,
    @Body() body: { assignedToUserId: string | null },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.assignJob(tenantId, jobId, body.assignedToUserId);
  }

  @Patch('jobs/:jobId/checklist/:itemId')
  async toggleChecklistItem(
    @Param('jobId') jobId: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.toggleChecklistItem(tenantId, jobId, itemId);
  }

  @Post('jobs/:jobId/comments')
  async addJobComment(
    @Param('jobId') jobId: string,
    @Body() body: { comment: string },
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.workflowService.addJobComment(tenantId, userId, jobId, body.comment);
  }

  @Get('clients/:clientId/360')
  async getClient360(@Param('clientId') clientId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.getClient360(tenantId, clientId);
  }

  @Post('clients/:clientId/contacts')
  async addClientContact(
    @Param('clientId') clientId: string,
    @Body() body: { name: string; role: string; email?: string; phone?: string; isPrimary?: boolean },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.addClientContact(tenantId, clientId, body);
  }

  @Delete('contacts/:contactId')
  async deleteClientContact(@Param('contactId') contactId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.workflowService.deleteClientContact(tenantId, contactId);
  }
}

