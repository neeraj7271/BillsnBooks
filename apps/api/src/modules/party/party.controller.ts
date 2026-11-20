import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { PartyService } from './party.service';
import { PartyType, PartyDto } from '@platform/shared-types';

@Controller('v1/companies/:companyId/parties')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  private getContext(req: any) {
    const tenantId =
      req.user?.tenantId ||
      req.headers['x-tenant-id'] ||
      'a0000000-0000-4000-8000-000000000001';
    const userId =
      req.user?.id ||
      req.headers['x-user-id'] ||
      'b0000000-0000-4000-8000-000000000001';

    return { tenantId, userId };
  }

  @Get()
  async listParties(
    @Param('companyId') companyId: string,
    @Query('partyType') partyType: PartyType,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.partyService.listParties(tenantId, companyId, partyType);
  }

  @Get(':id')
  async getParty(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.partyService.getParty(tenantId, companyId, id);
  }

  @Post()
  async createParty(
    @Param('companyId') companyId: string,
    @Body() dto: PartyDto,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.partyService.createParty(tenantId, companyId, dto);
  }

  @Put(':id')
  async updateParty(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<PartyDto>,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.partyService.updateParty(tenantId, companyId, id, dto);
  }

  @Delete(':id')
  async deleteParty(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.partyService.deleteParty(tenantId, companyId, id);
  }
}

