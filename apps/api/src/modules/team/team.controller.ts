import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { requireContext } from '../../common/http/request-context';

@Controller('v1/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async listTeam(@Request() req: any) {
    const { tenantId } = requireContext(req);
    return await this.teamService.listColleaguesAndInvites(tenantId);
  }

  @Post('invitations')
  async createInvitation(@Body() body: any, @Request() req: any) {
    const { tenantId, userId, role } = requireContext(req);
    return await this.teamService.createInvitation(tenantId, userId, role, body);
  }

  @Post('invitations/:id/resend')
  async resendInvitation(@Param('id') id: string, @Request() req: any) {
    const { tenantId, role } = requireContext(req);
    return await this.teamService.resendInvitation(tenantId, role, id);
  }

  @Post('invitations/:id/revoke')
  async revokeInvitation(@Param('id') id: string, @Request() req: any) {
    const { tenantId, role } = requireContext(req);
    return await this.teamService.revokeInvitation(tenantId, role, id);
  }

  @Post('members')
  async addMemberDirectly(@Body() body: any, @Request() req: any) {
    const { tenantId, role } = requireContext(req);
    return await this.teamService.addMemberDirectly(tenantId, role, body);
  }

  @Patch('members/:userId')
  async updateMember(@Param('userId') userId: string, @Body() body: any, @Request() req: any) {
    const { tenantId, role } = requireContext(req);
    return await this.teamService.updateMember(tenantId, role, userId, body);
  }

  @Get('permission-roles')
  async listPermissionRoles(@Request() req: any) {
    const { tenantId } = requireContext(req);
    return await this.teamService.listPermissionRoles(tenantId);
  }

  @Post('permission-roles')
  async createPermissionRole(@Body() body: any, @Request() req: any) {
    const { tenantId, role } = requireContext(req);
    return await this.teamService.createPermissionRole(tenantId, role, body);
  }

  @Patch('permission-roles/:id')
  async updatePermissionRole(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const { tenantId, role } = requireContext(req);
    return await this.teamService.updatePermissionRole(tenantId, role, id, body);
  }

  @Get('job-roles')
  async listJobRoles(@Request() req: any) {
    const { tenantId } = requireContext(req);
    return await this.teamService.listJobRoles(tenantId);
  }

  @Post('job-roles')
  async createJobRole(@Body() body: any, @Request() req: any) {
    const { tenantId, role } = requireContext(req);
    return await this.teamService.createJobRole(tenantId, role, body);
  }

  @Get('clients/:clientId')
  async getClientTeam(@Param('clientId') clientId: string, @Request() req: any) {
    const { tenantId } = requireContext(req);
    return await this.teamService.getClientTeam(tenantId, clientId);
  }

  @Post('clients/:clientId/members')
  async addClientTeamMember(@Param('clientId') clientId: string, @Body() body: any, @Request() req: any) {
    const { tenantId } = requireContext(req);
    return await this.teamService.addClientTeamMember(tenantId, clientId, body);
  }

  @Post('clients/:clientId/job-roles')
  async assignClientJobRole(@Param('clientId') clientId: string, @Body() body: any, @Request() req: any) {
    const { tenantId } = requireContext(req);
    return await this.teamService.assignClientJobRole(tenantId, clientId, body);
  }

  @Delete('clients/:clientId/members/:userId')
  async removeClientTeamMember(
    @Param('clientId') clientId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const { tenantId } = requireContext(req);
    return await this.teamService.removeClientTeamMember(tenantId, clientId, userId);
  }
}
