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
}

