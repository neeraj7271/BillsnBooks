import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { StaffAssignmentOrmEntity } from '../../infrastructure/persistence/entities/staff-assignment.orm-entity';
import { ComplianceTaskOrmEntity } from '../../infrastructure/persistence/entities/compliance-task.orm-entity';
import { TaskCommentOrmEntity } from '../../infrastructure/persistence/entities/task-comment.orm-entity';
import { ClientDocumentRequestOrmEntity } from '../../infrastructure/persistence/entities/client-document-request.orm-entity';

@Module({
  imports: [
    PersistenceModule,
    TypeOrmModule.forFeature([
      FirmClientOrmEntity,
      StaffAssignmentOrmEntity,
      ComplianceTaskOrmEntity,
      TaskCommentOrmEntity,
      ClientDocumentRequestOrmEntity,
    ]),
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}

