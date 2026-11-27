import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { PracticeJobOrmEntity } from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import {
  TeamInvitationOrmEntity,
  PermissionRoleOrmEntity,
  JobRoleOrmEntity,
  ClientJobRoleAssignmentOrmEntity,
  ClientTeamMemberOrmEntity,
  PracticeJobReviewOrmEntity,
} from '../../infrastructure/persistence/entities/team-and-review.orm-entity';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';

@Module({
  imports: [
    PersistenceModule,
    TypeOrmModule.forFeature([
      UserOrmEntity,
      TenantOrmEntity,
      PracticeJobOrmEntity,
      TeamInvitationOrmEntity,
      PermissionRoleOrmEntity,
      JobRoleOrmEntity,
      ClientJobRoleAssignmentOrmEntity,
      ClientTeamMemberOrmEntity,
      PracticeJobReviewOrmEntity,
    ]),
  ],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
