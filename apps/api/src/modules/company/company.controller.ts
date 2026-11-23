import { Controller, Get, Post, Put, Param, Body, Request } from '@nestjs/common';
import { requireContext } from '../../common/http/request-context';
import { CompanyService, CreateCompanyDto, UpdateCompanyDto, AddBranchDto } from './company.service';

@Controller('v1/companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  private getTenantId(req: any): string {
    return requireContext(req).tenantId;
  }

  @Get()
  async listCompanies(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return await this.companyService.listCompanies(tenantId);
  }

  @Post()
  async createCompany(@Body() dto: CreateCompanyDto, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return await this.companyService.createCompany(tenantId, dto);
  }

  @Get(':id')
  async getCompany(@Param('id') id: string, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return await this.companyService.getCompanyById(tenantId, id);
  }

  @Put(':id')
  async updateCompany(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.companyService.updateCompany(tenantId, id, dto);
  }

  @Get(':id/branches')
  async listBranches(@Param('id') companyId: string, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return await this.companyService.listBranches(tenantId, companyId);
  }

  @Post(':id/branches')
  async addBranch(
    @Param('id') companyId: string,
    @Body() dto: AddBranchDto,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.companyService.addBranch(tenantId, companyId, dto);
  }
}
