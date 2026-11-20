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
import { ItemDto } from '@platform/shared-types';

@Controller('v1/companies/:companyId/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

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

