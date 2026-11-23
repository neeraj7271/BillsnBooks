import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ItemService } from './item.service';
import { requireContext } from '../../common/http/request-context';
import { ItemDto } from '@platform/shared-types';

@Controller('v1/companies/:companyId/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  private getContext(req: any) {
    return requireContext(req);
  }

  @Get()
  async listItems(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.listItems(tenantId, companyId);
  }

  @Get('units')
  async listUnits(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.listUnits(tenantId, companyId);
  }

  @Post('units')
  async createCustomUnit(
    @Param('companyId') companyId: string,
    @Body() dto: { code: string; name: string; description?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.createCustomUnit(tenantId, companyId, dto);
  }

  @Put('units/:code')
  async updateCustomUnit(
    @Param('companyId') companyId: string,
    @Param('code') code: string,
    @Body() dto: { name: string; description?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.updateCustomUnit(tenantId, companyId, code, dto);
  }

  @Delete('units/:code')
  async deleteCustomUnit(
    @Param('companyId') companyId: string,
    @Param('code') code: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.deleteCustomUnit(tenantId, companyId, code);
  }

  @Get(':id')
  async getItem(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.getItem(tenantId, companyId, id);
  }

  @Post()
  async createItem(
    @Param('companyId') companyId: string,
    @Body() dto: ItemDto,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.createItem(tenantId, companyId, dto);
  }

  @Put(':id')
  async updateItem(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<ItemDto>,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.updateItem(tenantId, companyId, id, dto);
  }

  @Delete(':id')
  async deleteItem(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.itemService.deleteItem(tenantId, companyId, id);
  }
}

