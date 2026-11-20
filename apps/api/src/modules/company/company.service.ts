import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';
import { VoucherSequenceOrmEntity } from '../../infrastructure/persistence/entities/voucher-sequence.orm-entity';
import { BusinessTemplate, VoucherType } from '@platform/shared-types';
import { ChartOfAccountsSeeder } from '../ledger/coa-seeder.service';

export interface CreateCompanyDto {
  legalName: string;
  tradeName?: string;
  pan?: string;
  gstin?: string;
  stateCode?: string;
  defaultCurrency?: string;
  template?: BusinessTemplate;
}

export interface UpdateCompanyDto {
  legalName?: string;
  tradeName?: string;
  pan?: string;
  defaultCurrency?: string;
  gstin?: string;
  stateCode?: string;
  addressLine1?: string;
  pincode?: string;
  isActive?: boolean;
}

export interface AddBranchDto {
  branchName: string;
  gstin?: string;
  stateCode: string;
  addressLine1?: string;
  pincode?: string;
  isHeadOffice?: boolean;
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly coaSeeder: ChartOfAccountsSeeder,
  ) {}

  private formatCompany(c: CompanyOrmEntity) {
    return {
      id: c.id,
      tenantId: c.tenantId,
      legalName: c.legalName,
      tradeName: c.tradeName || c.legalName,
      pan: c.panEncrypted || null,
      panEncrypted: c.panEncrypted,
      defaultCurrency: c.defaultCurrency || 'INR',
      isActive: c.isActive,
      coaSeedVersion: c.coaSeedVersion,
      coaTemplate: c.coaTemplate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      branches: (c.branches || []).map((b) => ({
        id: b.id,
        tenantId: b.tenantId,
        companyId: b.companyId,
        branchName: b.branchName,
        name: b.branchName,
        gstin: b.gstin,
        stateCode: b.stateCode,
        addressLine1: b.addressLine1,
        pincode: b.pincode,
        isHeadOffice: b.isHeadOffice,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      financialYears: (c.financialYears || []).map((fy) => ({
        id: fy.id,
        tenantId: fy.tenantId,
        companyId: fy.companyId,
        name: fy.name,
        startDate: fy.startDate,
        endDate: fy.endDate,
        isClosed: fy.isClosed,
      })),
    };
  }

  async listCompanies(tenantId: string): Promise<any[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const companies = await qr.manager.find(CompanyOrmEntity, {
        where: { tenantId, isActive: true },
        relations: ['branches', 'financialYears'],
        order: { createdAt: 'ASC' },
      });
      return companies.map((c) => this.formatCompany(c));
    });
  }

  async getCompanyById(tenantId: string, companyId: string): Promise<any> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const company = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: companyId, tenantId },
        relations: ['branches', 'financialYears'],
      });
      if (!company) {
        throw new NotFoundException(`Company ${companyId} not found.`);
      }
      return this.formatCompany(company);
    });
  }

  async createCompany(tenantId: string, dto: CreateCompanyDto): Promise<any> {
    if (!dto.legalName) {
      throw new BadRequestException('Legal name is required.');
    }

    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      // 1. Create Company
      const company = qr.manager.create(CompanyOrmEntity, {
        tenantId,
        legalName: dto.legalName,
        tradeName: dto.tradeName || dto.legalName,
        panEncrypted: dto.pan ? dto.pan.toUpperCase() : null,
        defaultCurrency: dto.defaultCurrency || 'INR',
        isActive: true,
      });
      const savedCompany = await qr.manager.save(CompanyOrmEntity, company);

      // 2. Default Financial Year
      const currentYear = new Date().getFullYear();
      const fy = qr.manager.create(FinancialYearOrmEntity, {
        tenantId,
        companyId: savedCompany.id,
        name: `FY ${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
        startDate: `${currentYear}-04-01`,
        endDate: `${currentYear + 1}-03-31`,
        isClosed: false,
      });
      const savedFY = await qr.manager.save(FinancialYearOrmEntity, fy);

      // 3. Default Head Office Branch
      const branch = qr.manager.create(BranchOrmEntity, {
        tenantId,
        companyId: savedCompany.id,
        branchName: 'Head Office',
        gstin: dto.gstin ? dto.gstin.toUpperCase() : null,
        stateCode: dto.stateCode || (dto.gstin ? dto.gstin.slice(0, 2) : '27'),
        isHeadOffice: true,
      });
      await qr.manager.save(BranchOrmEntity, branch);

      // 4. Seed Standard Statutory Chart of Accounts (Single atomic transaction)
      const template = dto.template || BusinessTemplate.TRADER;
      await this.coaSeeder.seedForCompany(
        qr.manager,
        savedCompany.id,
        tenantId,
        template,
      );

      // 5. Voucher Sequence for SALES
      const seq = qr.manager.create(VoucherSequenceOrmEntity, {
        tenantId,
        companyId: savedCompany.id,
        voucherType: VoucherType.SALES,
        series: 'DEFAULT',
        financialYearId: savedFY.id,
        lastSequence: 0,
        prefix: 'INV/',
        suffix: `/${(currentYear % 100).toString().padStart(2, '0')}-${((currentYear + 1) % 100).toString().padStart(2, '0')}`,
        padding: 4,
      });
      await qr.manager.save(VoucherSequenceOrmEntity, seq);

      const result = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: savedCompany.id, tenantId },
        relations: ['branches', 'financialYears'],
      });
      return this.formatCompany(result!);
    });
  }

  async updateCompany(tenantId: string, companyId: string, dto: UpdateCompanyDto): Promise<any> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const company = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: companyId, tenantId },
        relations: ['branches', 'financialYears'],
      });
      if (!company) {
        throw new NotFoundException(`Company ${companyId} not found.`);
      }

      if (dto.legalName !== undefined && dto.legalName.trim()) {
        company.legalName = dto.legalName.trim();
      }
      if (dto.tradeName !== undefined) {
        company.tradeName = dto.tradeName.trim() || company.legalName;
      }
      if (dto.pan !== undefined) {
        company.panEncrypted = dto.pan ? dto.pan.trim().toUpperCase() : null;
      }
      if (dto.defaultCurrency !== undefined && dto.defaultCurrency.trim()) {
        company.defaultCurrency = dto.defaultCurrency.trim().toUpperCase();
      }
      if (dto.isActive !== undefined) {
        company.isActive = dto.isActive;
      }

      await qr.manager.save(CompanyOrmEntity, company);

      // If head office branch parameters were provided, update head office branch
      if (
        dto.gstin !== undefined ||
        dto.stateCode !== undefined ||
        dto.addressLine1 !== undefined ||
        dto.pincode !== undefined
      ) {
        let headOfficeBranch = company.branches?.find((b) => b.isHeadOffice) || company.branches?.[0];
        if (headOfficeBranch) {
          if (dto.gstin !== undefined) {
            headOfficeBranch.gstin = dto.gstin ? dto.gstin.trim().toUpperCase() : null;
          }
          if (dto.stateCode !== undefined && dto.stateCode.trim()) {
            headOfficeBranch.stateCode = dto.stateCode.trim();
          } else if (dto.gstin && dto.gstin.trim().length >= 2) {
            headOfficeBranch.stateCode = dto.gstin.trim().slice(0, 2);
          }
          if (dto.addressLine1 !== undefined) {
            headOfficeBranch.addressLine1 = dto.addressLine1.trim() || null;
          }
          if (dto.pincode !== undefined) {
            headOfficeBranch.pincode = dto.pincode.trim() || null;
          }
          await qr.manager.save(BranchOrmEntity, headOfficeBranch);
        }
      }

      const refreshed = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: companyId, tenantId },
        relations: ['branches', 'financialYears'],
      });
      return this.formatCompany(refreshed!);
    });
  }

  async addBranch(tenantId: string, companyId: string, dto: AddBranchDto): Promise<BranchOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const company = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: companyId, tenantId },
      });
      if (!company) {
        throw new NotFoundException(`Company ${companyId} not found.`);
      }

      const branch = qr.manager.create(BranchOrmEntity, {
        tenantId,
        companyId,
        branchName: dto.branchName,
        gstin: dto.gstin ? dto.gstin.toUpperCase() : null,
        stateCode: dto.stateCode,
        addressLine1: dto.addressLine1 || null,
        pincode: dto.pincode || null,
        isHeadOffice: !!dto.isHeadOffice,
      });

      return await qr.manager.save(BranchOrmEntity, branch);
    });
  }

  async listBranches(tenantId: string, companyId: string): Promise<BranchOrmEntity[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      return qr.manager.find(BranchOrmEntity, {
        where: { tenantId, companyId },
        order: { isHeadOffice: 'DESC', branchName: 'ASC' },
      });
    });
  }
}
