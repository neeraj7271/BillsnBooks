import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { DocumentVaultService } from './document-vault.service';
import { PracticeWorkflowService } from './practice-workflow.service';
import { PracticeV2Service } from './practice-v2.service';
import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { StaffAssignmentOrmEntity } from '../../infrastructure/persistence/entities/staff-assignment.orm-entity';
import { ComplianceTaskOrmEntity } from '../../infrastructure/persistence/entities/compliance-task.orm-entity';
import { TaskCommentOrmEntity } from '../../infrastructure/persistence/entities/task-comment.orm-entity';
import { ClientDocumentRequestOrmEntity } from '../../infrastructure/persistence/entities/client-document-request.orm-entity';
import { DocumentFolderOrmEntity } from '../../infrastructure/persistence/entities/document-folder.orm-entity';
import { DocumentFileOrmEntity } from '../../infrastructure/persistence/entities/document-file.orm-entity';
import { AuditLogOrmEntity } from '../../infrastructure/persistence/entities/audit-log.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { WorkflowTemplateOrmEntity } from '../../infrastructure/persistence/entities/workflow-template.orm-entity';
import { PracticeJobOrmEntity } from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import { PracticeJobCommentOrmEntity } from '../../infrastructure/persistence/entities/practice-job-comment.orm-entity';
import { ClientContactOrmEntity } from '../../infrastructure/persistence/entities/client-contact.orm-entity';
import { PracticeTimeEntryOrmEntity } from '../../infrastructure/persistence/entities/practice-time-entry.orm-entity';
import { ServiceTypeOrmEntity } from '../../infrastructure/persistence/entities/service-type.orm-entity';
import { ClientServiceOrmEntity } from '../../infrastructure/persistence/entities/client-service.orm-entity';
import { ClientCredentialOrmEntity } from '../../infrastructure/persistence/entities/client-credential.orm-entity';
import { PracticeCustomFieldOrmEntity } from '../../infrastructure/persistence/entities/practice-custom-field.orm-entity';
import { PracticeLabelOrmEntity } from '../../infrastructure/persistence/entities/practice-label.orm-entity';

@Module({
  imports: [
    PersistenceModule,
    TypeOrmModule.forFeature([
      FirmClientOrmEntity,
      StaffAssignmentOrmEntity,
      ComplianceTaskOrmEntity,
      TaskCommentOrmEntity,
      ClientDocumentRequestOrmEntity,
      DocumentFolderOrmEntity,
      DocumentFileOrmEntity,
      AuditLogOrmEntity,
      UserOrmEntity,
      WorkflowTemplateOrmEntity,
      PracticeJobOrmEntity,
      PracticeJobCommentOrmEntity,
      ClientContactOrmEntity,
      PracticeTimeEntryOrmEntity,
      ServiceTypeOrmEntity,
      ClientServiceOrmEntity,
      ClientCredentialOrmEntity,
      PracticeCustomFieldOrmEntity,
      PracticeLabelOrmEntity,
    ]),
  ],
  controllers: [PracticeController],
  providers: [PracticeService, DocumentVaultService, PracticeWorkflowService, PracticeV2Service],
  exports: [PracticeService, DocumentVaultService, PracticeWorkflowService, PracticeV2Service],
})
export class PracticeModule {}

