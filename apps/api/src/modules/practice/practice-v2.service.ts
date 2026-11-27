import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { EntityManager } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import {
  ServiceTypeOrmEntity,
  ServiceStageDef,
  ServiceChecklistDef,
  DueDateRuleDef,
} from '../../infrastructure/persistence/entities/service-type.orm-entity';
import { ClientServiceOrmEntity } from '../../infrastructure/persistence/entities/client-service.orm-entity';
import { ClientCredentialOrmEntity } from '../../infrastructure/persistence/entities/client-credential.orm-entity';
import { PracticeCustomFieldOrmEntity } from '../../infrastructure/persistence/entities/practice-custom-field.orm-entity';
import { PracticeLabelOrmEntity } from '../../infrastructure/persistence/entities/practice-label.orm-entity';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { WorkflowTemplateOrmEntity } from '../../infrastructure/persistence/entities/workflow-template.orm-entity';
import { PracticeJobOrmEntity } from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import { AuditLogOrmEntity } from '../../infrastructure/persistence/entities/audit-log.orm-entity';

const STANDARD_STAGES: ServiceStageDef[] = [
  { key: 'BACKLOG', label: 'Backlog / Docs Pending', order: 1, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 5 },
  { key: 'IN_PROGRESS', label: 'Preparation', order: 2, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 3 },
  { key: 'REVIEW', label: 'Partner Review', order: 3, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 2, requiresApproval: true },
  { key: 'AWAITING_CLIENT', label: 'Client Sign-off', order: 4, assigneeRole: 'CLIENT_VIEWER', slaOffsetDays: 2 },
  { key: 'FILED', label: 'Filed / Submitted', order: 5, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 1 },
  { key: 'DONE', label: 'Completed & Archived', order: 6, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 0 },
];

const AUDIT_STAGES: ServiceStageDef[] = [
  { key: 'PLANNING', label: 'Planning & Engagement', order: 1, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 10 },
  { key: 'FIELDWORK', label: 'Fieldwork & Vouching', order: 2, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 15 },
  { key: 'DRAFT_REPORT', label: 'Draft Report / 3CD', order: 3, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 7 },
  { key: 'PARTNER_REVIEW', label: 'Partner Review', order: 4, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 5, requiresApproval: true },
  { key: 'UDIN_GENERATED', label: 'UDIN & Sign-off', order: 5, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 2 },
  { key: 'DONE', label: 'Filed & Closed', order: 6, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 0 },
];

interface SeedServiceDef {
  code: string;
  name: string;
  category: string;
  frequency: string;
  statutoryFormRef: string;
  defaultDueDateRule: DueDateRuleDef;
  defaultAssigneeRole: string;
  estimatedHours: number;
  sortOrder: number;
  description: string;
  defaultStages: ServiceStageDef[];
  defaultChecklist: ServiceChecklistDef[];
}

const DEFAULT_INDIAN_CA_SERVICES: SeedServiceDef[] = [
  {
    code: 'GSTR-1',
    name: 'GSTR-1 Monthly Return',
    category: 'GST',
    frequency: 'MONTHLY',
    statutoryFormRef: 'Form GSTR-1',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 11 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 2,
    sortOrder: 10,
    description: 'Outward supplies statement including B2B, B2C, CDNR, and HSN summary.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'g1-1', title: 'Export sales register & e-invoice JSON', stage: 'BACKLOG' },
      { id: 'g1-2', title: 'Reconcile HSN & B2B GSTINs', stage: 'IN_PROGRESS' },
      { id: 'g1-3', title: 'Review & file GSTR-1 on GSTN', stage: 'FILED' },
    ],
  },
  {
    code: 'GSTR-3B',
    name: 'GSTR-3B Monthly Return',
    category: 'GST',
    frequency: 'MONTHLY',
    statutoryFormRef: 'Form GSTR-3B',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 20 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 3,
    sortOrder: 20,
    description: 'Monthly summary GST return with ITC reconciliation and PMT-06 tax payment.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'g3b-1', title: 'Verify GSTR-1 liability auto-population', stage: 'BACKLOG' },
      { id: 'g3b-2', title: 'Reconcile ITC with GSTR-2B', stage: 'IN_PROGRESS' },
      { id: 'g3b-3', title: 'Generate PMT-06 challan & confirm payment', stage: 'AWAITING_CLIENT' },
      { id: 'g3b-4', title: 'File GSTR-3B & archive ARN', stage: 'FILED' },
    ],
  },
  {
    code: 'GSTR-2B-RECON',
    name: 'GST Reconciliation (2B)',
    category: 'GST',
    frequency: 'MONTHLY',
    statutoryFormRef: 'GSTR-2B vs Books',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 16 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 2.5,
    sortOrder: 30,
    description: 'Monthly purchase register vs GSTR-2B matching and vendor follow-up.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'g2b-1', title: 'Download GSTR-2B JSON', stage: 'BACKLOG' },
      { id: 'g2b-2', title: 'Run invoice-level matching & flag mismatches', stage: 'IN_PROGRESS' },
      { id: 'g2b-3', title: 'Send mismatch report to client/vendors', stage: 'AWAITING_CLIENT' },
    ],
  },
  {
    code: 'GSTR-9-9C',
    name: 'GSTR-9 / 9C Annual Return',
    category: 'GST',
    frequency: 'ANNUAL',
    statutoryFormRef: 'Form GSTR-9 / 9C',
    defaultDueDateRule: { basis: 'fixed_date', fixedMonth: 12, fixedDay: 31 },
    defaultAssigneeRole: 'FIRM_PARTNER',
    estimatedHours: 12,
    sortOrder: 40,
    description: 'Annual GST return and reconciliation statement.',
    defaultStages: AUDIT_STAGES,
    defaultChecklist: [
      { id: 'g9-1', title: 'Consolidate 12-month GSTR-1, 3B & 2B data', stage: 'PLANNING' },
      { id: 'g9-2', title: 'Reconcile turnover & ITC with audited financial statements', stage: 'FIELDWORK' },
      { id: 'g9-3', title: 'Prepare Form 9C tables & partner sign-off', stage: 'PARTNER_REVIEW' },
    ],
  },
  {
    code: 'TDS-24Q',
    name: 'TDS Return 24Q (Salary)',
    category: 'TDS / TCS',
    frequency: 'QUARTERLY',
    statutoryFormRef: 'Form 24Q',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 31 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 3,
    sortOrder: 50,
    description: 'Quarterly salary TDS statement and Form 16 generation.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 't24-1', title: 'Collect monthly payroll & TDS challans', stage: 'BACKLOG' },
      { id: 't24-2', title: 'Verify CSI file & validate with FVU', stage: 'IN_PROGRESS' },
      { id: 't24-3', title: 'File 24Q on TRACES / Protean', stage: 'FILED' },
    ],
  },
  {
    code: 'TDS-26Q',
    name: 'TDS Return 26Q (Non-Salary)',
    category: 'TDS / TCS',
    frequency: 'QUARTERLY',
    statutoryFormRef: 'Form 26Q',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 31 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 3.5,
    sortOrder: 60,
    description: 'Quarterly non-salary vendor TDS return and Form 16A certificates.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 't26-1', title: 'Extract vendor deduction ledger & PAN check', stage: 'BACKLOG' },
      { id: 't26-2', title: 'Match OLTAS challans & generate FVU', stage: 'IN_PROGRESS' },
      { id: 't26-3', title: 'File 26Q & download Form 16A', stage: 'FILED' },
    ],
  },
  {
    code: 'TCS-27EQ',
    name: 'TCS Return 27EQ',
    category: 'TDS / TCS',
    frequency: 'QUARTERLY',
    statutoryFormRef: 'Form 27EQ',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 15 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 2,
    sortOrder: 70,
    description: 'Quarterly Tax Collected at Source statement.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 't27-1', title: 'Verify TCS collection ledger & challans', stage: 'BACKLOG' },
      { id: 't27-2', title: 'Validate FVU & upload 27EQ', stage: 'FILED' },
    ],
  },
  {
    code: 'ADV-TAX',
    name: 'Advance Tax Computation',
    category: 'Income Tax',
    frequency: 'QUARTERLY',
    statutoryFormRef: 'Challan 280',
    defaultDueDateRule: { basis: 'period_end', offsetDays: -15 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 3,
    sortOrder: 80,
    description: 'Quarterly estimated income computation & Advance Tax installment.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'at-1', title: 'Obtain YTD P&L & TDS credit summary', stage: 'BACKLOG' },
      { id: 'at-2', title: 'Compute installment & send Challan 280 to client', stage: 'AWAITING_CLIENT' },
    ],
  },
  {
    code: 'ITR-ANNUAL',
    name: 'ITR Filing (Annual)',
    category: 'Income Tax',
    frequency: 'ANNUAL',
    statutoryFormRef: 'ITR-3 / 4 / 5 / 6',
    defaultDueDateRule: { basis: 'fixed_date', fixedMonth: 10, fixedDay: 31 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 6,
    sortOrder: 90,
    description: 'Annual Income Tax Return preparation, AIS/26AS reconciliation & e-verification.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'itr-1', title: 'Download AIS, TIS & 26AS', stage: 'BACKLOG' },
      { id: 'itr-2', title: 'Prepare computation of income & MAT/AMT check', stage: 'IN_PROGRESS' },
      { id: 'itr-3', title: 'Partner review & client sign-off', stage: 'REVIEW' },
      { id: 'itr-4', title: 'Upload ITR JSON & complete e-Verification', stage: 'FILED' },
    ],
  },
  {
    code: 'TAX-AUDIT-44AB',
    name: 'Tax Audit (Sec 44AB)',
    category: 'Audit & Assurance',
    frequency: 'ANNUAL',
    statutoryFormRef: 'Form 3CA/3CB-3CD',
    defaultDueDateRule: { basis: 'fixed_date', fixedMonth: 9, fixedDay: 30 },
    defaultAssigneeRole: 'FIRM_PARTNER',
    estimatedHours: 20,
    sortOrder: 100,
    description: 'Statutory Tax Audit under section 44AB including MSME 43B(h) & clause verification.',
    defaultStages: AUDIT_STAGES,
    defaultChecklist: [
      { id: 'ta-1', title: 'Engagement letter & audit planning', stage: 'PLANNING' },
      { id: 'ta-2', title: 'Vouching, 40A(3), 43B(h) & TDS checks', stage: 'FIELDWORK' },
      { id: 'ta-3', title: 'Draft Form 3CD & partner review', stage: 'PARTNER_REVIEW' },
      { id: 'ta-4', title: 'Generate UDIN & upload on Income Tax portal', stage: 'UDIN_GENERATED' },
    ],
  },
  {
    code: 'STAT-AUDIT',
    name: 'Statutory Audit (Companies Act)',
    category: 'Audit & Assurance',
    frequency: 'ANNUAL',
    statutoryFormRef: 'Independent Auditor Report',
    defaultDueDateRule: { basis: 'fixed_date', fixedMonth: 9, fixedDay: 30 },
    defaultAssigneeRole: 'FIRM_PARTNER',
    estimatedHours: 32,
    sortOrder: 110,
    description: 'Statutory financial audit under Companies Act 2013 & CARO 2020.',
    defaultStages: AUDIT_STAGES,
    defaultChecklist: [
      { id: 'sa-1', title: 'Audit engagement & materiality memo', stage: 'PLANNING' },
      { id: 'sa-2', title: 'Substantive testing & Schedule III grouping', stage: 'FIELDWORK' },
      { id: 'sa-3', title: 'CARO 2020 & IFC report review', stage: 'PARTNER_REVIEW' },
      { id: 'sa-4', title: 'Sign financial statements & generate UDIN', stage: 'UDIN_GENERATED' },
    ],
  },
  {
    code: 'ROC-AOC4',
    name: 'ROC AOC-4 (Financials)',
    category: 'ROC / MCA',
    frequency: 'ANNUAL',
    statutoryFormRef: 'Form AOC-4',
    defaultDueDateRule: { basis: 'fixed_date', fixedMonth: 10, fixedDay: 29 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 3,
    sortOrder: 120,
    description: 'Annual filing of financial statements and Board Report with MCA.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'aoc-1', title: 'Collect signed financial statements & Board Report', stage: 'BACKLOG' },
      { id: 'aoc-2', title: 'Prepare AOC-4 / XBRL & attach DSC', stage: 'IN_PROGRESS' },
      { id: 'aoc-3', title: 'Upload on MCA V3 & archive SRN', stage: 'FILED' },
    ],
  },
  {
    code: 'ROC-MGT7',
    name: 'ROC MGT-7 / 7A (Annual Return)',
    category: 'ROC / MCA',
    frequency: 'ANNUAL',
    statutoryFormRef: 'Form MGT-7 / 7A',
    defaultDueDateRule: { basis: 'fixed_date', fixedMonth: 11, fixedDay: 28 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 3,
    sortOrder: 130,
    description: 'Annual ROC return covering shareholding, directors, and meetings.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'mgt-1', title: 'Verify shareholding & director register', stage: 'BACKLOG' },
      { id: 'mgt-2', title: 'Pre-fill MGT-7 & certify', stage: 'REVIEW' },
      { id: 'mgt-3', title: 'File on MCA & archive SRN', stage: 'FILED' },
    ],
  },
  {
    code: 'DIR-3-KYC',
    name: 'DIR-3 KYC (Directors)',
    category: 'ROC / MCA',
    frequency: 'ANNUAL',
    statutoryFormRef: 'DIR-3 KYC / Web',
    defaultDueDateRule: { basis: 'fixed_date', fixedMonth: 9, fixedDay: 30 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 1,
    sortOrder: 140,
    description: 'Annual DIN KYC verification for all directors.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'dir-1', title: 'Confirm director email & mobile OTPs', stage: 'AWAITING_CLIENT' },
      { id: 'dir-2', title: 'Submit DIR-3 KYC on MCA', stage: 'FILED' },
    ],
  },
  {
    code: 'PF-ECR',
    name: 'PF Monthly ECR',
    category: 'Labour & Payroll',
    frequency: 'MONTHLY',
    statutoryFormRef: 'EPFO ECR',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 15 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 1.5,
    sortOrder: 150,
    description: 'Monthly EPFO Electronic Challan cum Return filing.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'pf-1', title: 'Verify UAN & monthly wage sheet', stage: 'BACKLOG' },
      { id: 'pf-2', title: 'Upload ECR & pay challan', stage: 'FILED' },
    ],
  },
  {
    code: 'ESI-RETURN',
    name: 'ESI Monthly Contribution',
    category: 'Labour & Payroll',
    frequency: 'MONTHLY',
    statutoryFormRef: 'ESIC Challan',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 15 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 1,
    sortOrder: 160,
    description: 'Monthly ESIC contribution calculation & challan generation.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'esi-1', title: 'Check employee gross threshold & IP numbers', stage: 'BACKLOG' },
      { id: 'esi-2', title: 'Generate ESIC challan & confirm payment', stage: 'FILED' },
    ],
  },
  {
    code: 'PT-MONTHLY',
    name: 'Professional Tax',
    category: 'Labour & Payroll',
    frequency: 'MONTHLY',
    statutoryFormRef: 'State PT Return',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 20 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 1,
    sortOrder: 170,
    description: 'Monthly state Professional Tax deduction return & payment.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'pt-1', title: 'Compute state-wise PT slabs', stage: 'IN_PROGRESS' },
      { id: 'pt-2', title: 'Pay PT & file return', stage: 'FILED' },
    ],
  },
  {
    code: 'PAYROLL-PROC',
    name: 'Payroll Processing',
    category: 'Labour & Payroll',
    frequency: 'MONTHLY',
    statutoryFormRef: 'Payslips & Bank Advice',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 0 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 4,
    sortOrder: 180,
    description: 'Monthly payroll run, TDS/PF/PT deductions, payslips, and bank advice.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'pay-1', title: 'Collect attendance, leave & variable pay inputs', stage: 'BACKLOG' },
      { id: 'pay-2', title: 'Process payroll & verify statutory deductions', stage: 'IN_PROGRESS' },
      { id: 'pay-3', title: 'Client approval & release payslips', stage: 'DONE' },
    ],
  },
  {
    code: 'BOOKKEEPING',
    name: 'Bookkeeping / Monthly Close',
    category: 'Accounting',
    frequency: 'MONTHLY',
    statutoryFormRef: 'MIS & Trial Balance',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 10 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 8,
    sortOrder: 190,
    description: 'Monthly bank reconciliation, voucher posting, ledger scrutiny, and MIS pack.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'bk-1', title: 'Import bank statements & reconcile all bank accounts', stage: 'BACKLOG' },
      { id: 'bk-2', title: 'Post accruals, depreciation & expense entries', stage: 'IN_PROGRESS' },
      { id: 'bk-3', title: 'Partner MIS review & share monthly pack', stage: 'REVIEW' },
    ],
  },
  {
    code: 'ADVISORY',
    name: 'Advisory / Consulting',
    category: 'Advisory',
    frequency: 'ONE_TIME',
    statutoryFormRef: 'Advisory Memo',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 14 },
    defaultAssigneeRole: 'FIRM_PARTNER',
    estimatedHours: 5,
    sortOrder: 200,
    description: 'Tax structuring, FEMA/valuation advisory, or management consulting assignment.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'adv-1', title: 'Scope discussion & fact gathering', stage: 'BACKLOG' },
      { id: 'adv-2', title: 'Research & draft opinion memo', stage: 'IN_PROGRESS' },
      { id: 'adv-3', title: 'Partner sign-off & client presentation', stage: 'DONE' },
    ],
  },
  {
    code: 'PROJECT-ONEOFF',
    name: 'Project / One-off Assignment',
    category: 'Special Projects',
    frequency: 'ONE_TIME',
    statutoryFormRef: 'Custom Deliverable',
    defaultDueDateRule: { basis: 'period_end', offsetDays: 15 },
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    estimatedHours: 4,
    sortOrder: 210,
    description: 'One-time registration, amendment, certification, or bespoke client deliverable.',
    defaultStages: STANDARD_STAGES,
    defaultChecklist: [
      { id: 'prj-1', title: 'Collect KYC & supporting documents', stage: 'BACKLOG' },
      { id: 'prj-2', title: 'Execute deliverable & QA check', stage: 'IN_PROGRESS' },
      { id: 'prj-3', title: 'Deliver final certificate / acknowledgement', stage: 'DONE' },
    ],
  },
];

@Injectable()
export class PracticeV2Service {
  constructor(private readonly uow: UnitOfWorkService) {}

  private buildHash(payload: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  /**
   * Seeds the 21 Indian CA services for a tenant if not yet initialized,
   * and backfills service_type_id on legacy practice_jobs & compliance_tasks.
   */
  async ensureDefaultServicesInTx(manager: EntityManager, tenantId: string): Promise<ServiceTypeOrmEntity[]> {
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext('seed_services_' || $1))`, [tenantId]);
    const repo = manager.getRepository(ServiceTypeOrmEntity);
    const existing = await repo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    if (existing.length > 0) return existing;

    const created: ServiceTypeOrmEntity[] = [];
    for (const s of DEFAULT_INDIAN_CA_SERVICES) {
      const entity = repo.create({
        tenantId,
        code: s.code,
        name: s.name,
        category: s.category,
        description: s.description,
        frequency: s.frequency,
        defaultDueDateRule: s.defaultDueDateRule,
        defaultStages: s.defaultStages,
        defaultChecklist: s.defaultChecklist,
        defaultAssigneeRole: s.defaultAssigneeRole,
        defaultPriority: 'MEDIUM',
        estimatedHours: s.estimatedHours,
        isActive: true,
        isSystemSeeded: true,
        sortOrder: s.sortOrder,
        statutoryFormRef: s.statutoryFormRef,
      });
      created.push(await repo.save(entity));
    }

    // Backfill legacy jobs & tasks so existing data maps cleanly to Service Master
    const gstr3b = created.find((c) => c.code === 'GSTR-3B');
    const tds26q = created.find((c) => c.code === 'TDS-26Q');
    const itr = created.find((c) => c.code === 'ITR-ANNUAL');
    const taxAudit = created.find((c) => c.code === 'TAX-AUDIT-44AB');
    const roc = created.find((c) => c.code === 'ROC-AOC4');

    if (gstr3b) {
      await manager.query(
        `UPDATE practice_jobs SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND (job_type ILIKE '%GST%' OR title ILIKE '%GST%')`,
        [gstr3b.id, tenantId],
      );
      await manager.query(
        `UPDATE compliance_tasks SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND category = 'GST'`,
        [gstr3b.id, tenantId],
      );
    }
    if (tds26q) {
      await manager.query(
        `UPDATE practice_jobs SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND (job_type ILIKE '%TDS%' OR title ILIKE '%TDS%')`,
        [tds26q.id, tenantId],
      );
      await manager.query(
        `UPDATE compliance_tasks SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND category = 'TDS'`,
        [tds26q.id, tenantId],
      );
    }
    if (itr) {
      await manager.query(
        `UPDATE practice_jobs SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND (job_type ILIKE '%ITR%' OR title ILIKE '%ITR%')`,
        [itr.id, tenantId],
      );
      await manager.query(
        `UPDATE compliance_tasks SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND category = 'INCOME_TAX'`,
        [itr.id, tenantId],
      );
    }
    if (taxAudit) {
      await manager.query(
        `UPDATE practice_jobs SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND (job_type ILIKE '%AUDIT%' OR title ILIKE '%AUDIT%')`,
        [taxAudit.id, tenantId],
      );
      await manager.query(
        `UPDATE compliance_tasks SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND category = 'AUDIT'`,
        [taxAudit.id, tenantId],
      );
    }
    if (roc) {
      await manager.query(
        `UPDATE practice_jobs SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND (job_type ILIKE '%ROC%' OR title ILIKE '%ROC%')`,
        [roc.id, tenantId],
      );
      await manager.query(
        `UPDATE compliance_tasks SET service_type_id = $1 WHERE tenant_id = $2 AND service_type_id IS NULL AND category = 'ROC'`,
        [roc.id, tenantId],
      );
    }

    return created;
  }

  // ==================== SERVICE MASTER ====================

  async listServices(tenantId: string, includeInactive = false) {
    return await this.uow.executeInTransaction(async (qr) => {
      const services = await this.ensureDefaultServicesInTx(qr.manager, tenantId);
      const filtered = includeInactive ? services : services.filter((s) => s.isActive);

      const subCounts: Array<{ service_type_id: string; cnt: string }> = await qr.manager.query(
        `SELECT service_type_id, COUNT(*)::text AS cnt FROM client_services WHERE tenant_id = $1 AND is_active = true GROUP BY service_type_id`,
        [tenantId],
      );
      const jobCounts: Array<{ service_type_id: string; cnt: string }> = await qr.manager.query(
        `SELECT service_type_id, COUNT(*)::text AS cnt FROM practice_jobs WHERE tenant_id = $1 AND service_type_id IS NOT NULL GROUP BY service_type_id`,
        [tenantId],
      );

      const subMap = new Map(subCounts.map((r) => [r.service_type_id, Number(r.cnt)]));
      const jobMap = new Map(jobCounts.map((r) => [r.service_type_id, Number(r.cnt)]));

      return filtered.map((s) => ({
        ...s,
        estimatedHours: Number(s.estimatedHours || 0),
        subscriberCount: subMap.get(s.id) ?? 0,
        jobCount: jobMap.get(s.id) ?? 0,
      }));
    });
  }

  async getServiceCategories(tenantId: string): Promise<string[]> {
    return await this.uow.executeInTransaction(async (qr) => {
      await this.ensureDefaultServicesInTx(qr.manager, tenantId);
      const rows: Array<{ category: string }> = await qr.manager.query(
        `SELECT DISTINCT category FROM service_types WHERE tenant_id = $1 AND category IS NOT NULL AND category <> '' ORDER BY category ASC`,
        [tenantId],
      );
      return rows.map((r) => r.category);
    });
  }

  async createService(
    tenantId: string,
    dto: {
      name: string;
      code?: string;
      category: string;
      description?: string;
      frequency?: string;
      customRecurrenceRule?: string;
      defaultDueDateRule?: DueDateRuleDef;
      defaultStages?: ServiceStageDef[];
      defaultChecklist?: ServiceChecklistDef[];
      defaultAssigneeRole?: string;
      defaultPriority?: string;
      estimatedHours?: number;
      statutoryFormRef?: string;
    },
  ) {
    if (!dto.name?.trim()) throw new BadRequestException('Service name is required');
    if (!dto.category?.trim()) throw new BadRequestException('Service category is required');

    const rawCode =
      dto.code?.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-') ||
      dto.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

    return await this.uow.executeInTransaction(async (qr) => {
      await this.ensureDefaultServicesInTx(qr.manager, tenantId);
      const repo = qr.manager.getRepository(ServiceTypeOrmEntity);
      const dup = await repo.findOne({ where: { tenantId, code: rawCode } });
      const finalCode = dup ? `${rawCode}-${Date.now().toString().slice(-4)}` : rawCode;

      const entity = repo.create({
        tenantId,
        name: dto.name.trim(),
        code: finalCode,
        category: dto.category.trim(),
        description: dto.description?.trim() || null,
        frequency: dto.frequency || 'MONTHLY',
        customRecurrenceRule: dto.customRecurrenceRule?.trim() || null,
        defaultDueDateRule: dto.defaultDueDateRule || { basis: 'period_end', offsetDays: 20 },
        defaultStages: dto.defaultStages?.length ? dto.defaultStages : STANDARD_STAGES,
        defaultChecklist: dto.defaultChecklist || [],
        defaultAssigneeRole: dto.defaultAssigneeRole || 'STAFF_ACCOUNTANT',
        defaultPriority: dto.defaultPriority || 'MEDIUM',
        estimatedHours: dto.estimatedHours ?? 2,
        isActive: true,
        isSystemSeeded: false,
        sortOrder: 300,
        statutoryFormRef: dto.statutoryFormRef?.trim() || null,
      });
      return await repo.save(entity);
    });
  }

  async updateService(
    tenantId: string,
    id: string,
    dto: Partial<{
      name: string;
      code: string;
      category: string;
      description: string | null;
      frequency: string;
      customRecurrenceRule: string | null;
      defaultDueDateRule: DueDateRuleDef;
      defaultStages: ServiceStageDef[];
      defaultChecklist: ServiceChecklistDef[];
      defaultAssigneeRole: string | null;
      defaultPriority: string;
      estimatedHours: number;
      statutoryFormRef: string | null;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(ServiceTypeOrmEntity);
      const svc = await repo.findOne({ where: { id, tenantId } });
      if (!svc) throw new NotFoundException('Service not found');

      if (dto.name !== undefined) svc.name = dto.name.trim();
      if (dto.code !== undefined) svc.code = dto.code.trim().toUpperCase();
      if (dto.category !== undefined) svc.category = dto.category.trim();
      if (dto.description !== undefined) svc.description = dto.description;
      if (dto.frequency !== undefined) svc.frequency = dto.frequency;
      if (dto.customRecurrenceRule !== undefined) svc.customRecurrenceRule = dto.customRecurrenceRule;
      if (dto.defaultDueDateRule !== undefined) svc.defaultDueDateRule = dto.defaultDueDateRule;
      if (dto.defaultStages !== undefined) svc.defaultStages = dto.defaultStages;
      if (dto.defaultChecklist !== undefined) svc.defaultChecklist = dto.defaultChecklist;
      if (dto.defaultAssigneeRole !== undefined) svc.defaultAssigneeRole = dto.defaultAssigneeRole;
      if (dto.defaultPriority !== undefined) svc.defaultPriority = dto.defaultPriority;
      if (dto.estimatedHours !== undefined) svc.estimatedHours = dto.estimatedHours;
      if (dto.statutoryFormRef !== undefined) svc.statutoryFormRef = dto.statutoryFormRef;
      if (dto.isActive !== undefined) svc.isActive = dto.isActive;
      if (dto.sortOrder !== undefined) svc.sortOrder = dto.sortOrder;

      return await repo.save(svc);
    });
  }

  async cloneService(tenantId: string, id: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(ServiceTypeOrmEntity);
      const src = await repo.findOne({ where: { id, tenantId } });
      if (!src) throw new NotFoundException('Service not found');

      const copy = repo.create({
        tenantId,
        name: `${src.name} (Copy)`,
        code: `${src.code}-COPY-${Date.now().toString().slice(-4)}`.slice(0, 58),
        category: src.category,
        description: src.description,
        frequency: src.frequency,
        customRecurrenceRule: src.customRecurrenceRule,
        defaultDueDateRule: src.defaultDueDateRule,
        defaultStages: src.defaultStages,
        defaultChecklist: src.defaultChecklist,
        defaultAssigneeRole: src.defaultAssigneeRole,
        defaultPriority: src.defaultPriority,
        estimatedHours: src.estimatedHours,
        isActive: true,
        isSystemSeeded: false,
        sortOrder: src.sortOrder + 1,
        statutoryFormRef: src.statutoryFormRef,
      });
      return await repo.save(copy);
    });
  }

  async deleteService(tenantId: string, id: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(ServiceTypeOrmEntity);
      const svc = await repo.findOne({ where: { id, tenantId } });
      if (!svc) throw new NotFoundException('Service not found');

      const subCount = await qr.manager.count(ClientServiceOrmEntity, {
        where: { tenantId, serviceTypeId: id },
      });
      const jobCount = await qr.manager.count(PracticeJobOrmEntity, {
        where: { tenantId, serviceTypeId: id },
      });
      if (subCount > 0 || jobCount > 0) {
        throw new BadRequestException(
          `Cannot delete "${svc.name}" because ${subCount} client subscription(s) and ${jobCount} job(s) reference it. Disable it instead.`,
        );
      }

      await repo.remove(svc);
      return { deleted: true, id };
    });
  }

  // ==================== WORKFLOW TEMPLATES CRUD ====================

  async createTemplate(
    tenantId: string,
    dto: {
      name: string;
      jobType?: string;
      serviceTypeId?: string | null;
      description?: string;
      isRecurring?: boolean;
      recurrenceFrequency?: string | null;
      defaultDueDay?: number;
      stageConfigs?: ServiceStageDef[];
      stages?: string[];
      checklist?: Array<{ id: string; title: string; stage: string }>;
      isDefault?: boolean;
      isActive?: boolean;
    },
  ) {
    if (!dto.name?.trim()) throw new BadRequestException('Template name is required');
    const stageConfigs = dto.stageConfigs?.length
      ? dto.stageConfigs
      : (dto.stages || STANDARD_STAGES.map((s) => s.key)).map((k, idx) => ({
          key: k,
          label: k.replace(/_/g, ' '),
          order: idx + 1,
        }));
    const stages = stageConfigs.map((s) => s.key);

    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(WorkflowTemplateOrmEntity);
      const entity = repo.create({
        tenantId,
        name: dto.name.trim(),
        jobType: dto.jobType?.trim() || dto.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        serviceTypeId: dto.serviceTypeId || null,
        description: dto.description?.trim() || null,
        isRecurring: dto.isRecurring ?? true,
        recurrenceFrequency: dto.recurrenceFrequency ?? 'MONTHLY',
        defaultDueDay: dto.defaultDueDay ?? 20,
        stageConfigs,
        stages,
        checklist: dto.checklist || [],
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      });
      return await repo.save(entity);
    });
  }

  async updateTemplate(
    tenantId: string,
    id: string,
    dto: Partial<{
      name: string;
      jobType: string;
      serviceTypeId: string | null;
      description: string | null;
      isRecurring: boolean;
      recurrenceFrequency: string | null;
      defaultDueDay: number;
      stageConfigs: ServiceStageDef[];
      stages: string[];
      checklist: Array<{ id: string; title: string; stage: string }>;
      isDefault: boolean;
      isActive: boolean;
    }>,
  ) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(WorkflowTemplateOrmEntity);
      const tpl = await repo.findOne({ where: { id, tenantId } });
      if (!tpl) throw new NotFoundException('Workflow template not found');

      if (dto.name !== undefined) tpl.name = dto.name.trim();
      if (dto.jobType !== undefined) tpl.jobType = dto.jobType.trim();
      if (dto.serviceTypeId !== undefined) tpl.serviceTypeId = dto.serviceTypeId;
      if (dto.description !== undefined) tpl.description = dto.description;
      if (dto.isRecurring !== undefined) tpl.isRecurring = dto.isRecurring;
      if (dto.recurrenceFrequency !== undefined) tpl.recurrenceFrequency = dto.recurrenceFrequency;
      if (dto.defaultDueDay !== undefined) tpl.defaultDueDay = dto.defaultDueDay;
      if (dto.stageConfigs !== undefined) {
        tpl.stageConfigs = dto.stageConfigs;
        tpl.stages = dto.stageConfigs.map((s) => s.key);
      } else if (dto.stages !== undefined) {
        tpl.stages = dto.stages;
      }
      if (dto.checklist !== undefined) tpl.checklist = dto.checklist;
      if (dto.isDefault !== undefined) tpl.isDefault = dto.isDefault;
      if (dto.isActive !== undefined) tpl.isActive = dto.isActive;

      return await repo.save(tpl);
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(WorkflowTemplateOrmEntity);
      const tpl = await repo.findOne({ where: { id, tenantId } });
      if (!tpl) throw new NotFoundException('Workflow template not found');
      await repo.remove(tpl);
      return { deleted: true, id };
    });
  }

  // ==================== CLIENT-WORK MAPPING ====================

  async listClientServices(tenantId: string, clientId: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const rows = await qr.manager.find(ClientServiceOrmEntity, {
        where: { tenantId, clientId },
        relations: ['serviceType'],
        order: { createdAt: 'ASC' },
      });
      return rows.map((r) => ({
        ...r,
        feeAmount: r.feeAmount != null ? Number(r.feeAmount) : null,
      }));
    });
  }

  async subscribeClientServices(
    tenantId: string,
    clientId: string,
    items: Array<{
      serviceTypeId: string;
      startDate?: string;
      endDate?: string | null;
      feeAmount?: number | null;
      feeType?: string;
      assignedStaffId?: string | null;
      customStages?: ServiceStageDef[] | null;
      customDueRule?: DueDateRuleDef | null;
      isActive?: boolean;
    }>,
  ) {
    return await this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: clientId, tenantId },
      });
      if (!client) throw new NotFoundException('Client not found');

      const csRepo = qr.manager.getRepository(ClientServiceOrmEntity);
      const svcRepo = qr.manager.getRepository(ServiceTypeOrmEntity);
      const today = new Date().toISOString().slice(0, 10);
      const results: ClientServiceOrmEntity[] = [];

      for (const item of items) {
        const svc = await svcRepo.findOne({
          where: { id: item.serviceTypeId, tenantId },
        });
        if (!svc) throw new NotFoundException(`Service ${item.serviceTypeId} not found`);

        let existing = await csRepo.findOne({
          where: { tenantId, clientId, serviceTypeId: item.serviceTypeId },
        });

        if (!existing) {
          existing = csRepo.create({
            tenantId,
            clientId,
            serviceTypeId: item.serviceTypeId,
            startDate: item.startDate || today,
            endDate: item.endDate ?? null,
            feeAmount: item.feeAmount ?? null,
            feeType: item.feeType || 'recurring',
            assignedStaffId: item.assignedStaffId ?? null,
            customStages: item.customStages ?? null,
            customDueRule: item.customDueRule ?? null,
            isActive: item.isActive ?? true,
          });
        } else {
          if (item.startDate !== undefined) existing.startDate = item.startDate;
          if (item.endDate !== undefined) existing.endDate = item.endDate;
          if (item.feeAmount !== undefined) existing.feeAmount = item.feeAmount;
          if (item.feeType !== undefined) existing.feeType = item.feeType;
          if (item.assignedStaffId !== undefined) existing.assignedStaffId = item.assignedStaffId;
          if (item.customStages !== undefined) existing.customStages = item.customStages;
          if (item.customDueRule !== undefined) existing.customDueRule = item.customDueRule;
          if (item.isActive !== undefined) existing.isActive = item.isActive;
        }
        results.push(await csRepo.save(existing));
      }

      return results;
    });
  }

  async updateClientService(
    tenantId: string,
    id: string,
    patch: Partial<{
      startDate: string;
      endDate: string | null;
      feeAmount: number | null;
      feeType: string;
      assignedStaffId: string | null;
      customStages: ServiceStageDef[] | null;
      customDueRule: DueDateRuleDef | null;
      isActive: boolean;
    }>,
  ) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(ClientServiceOrmEntity);
      const cs = await repo.findOne({ where: { id, tenantId } });
      if (!cs) throw new NotFoundException('Client service subscription not found');

      if (patch.startDate !== undefined) cs.startDate = patch.startDate;
      if (patch.endDate !== undefined) cs.endDate = patch.endDate;
      if (patch.feeAmount !== undefined) cs.feeAmount = patch.feeAmount;
      if (patch.feeType !== undefined) cs.feeType = patch.feeType;
      if (patch.assignedStaffId !== undefined) cs.assignedStaffId = patch.assignedStaffId;
      if (patch.customStages !== undefined) cs.customStages = patch.customStages;
      if (patch.customDueRule !== undefined) cs.customDueRule = patch.customDueRule;
      if (patch.isActive !== undefined) cs.isActive = patch.isActive;

      return await repo.save(cs);
    });
  }

  async removeClientService(tenantId: string, id: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(ClientServiceOrmEntity);
      const cs = await repo.findOne({ where: { id, tenantId } });
      if (!cs) throw new NotFoundException('Client service subscription not found');
      await repo.remove(cs);
      return { deleted: true, id };
    });
  }

  // ==================== RECURRENCE ENGINE ====================

  computePeriodForFrequency(frequency: string, referenceDate = new Date()): string {
    const year = referenceDate.getUTCFullYear();
    const month = referenceDate.getUTCMonth() + 1;
    if (frequency === 'MONTHLY') {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    if (frequency === 'QUARTERLY') {
      const q = Math.ceil(month / 3);
      return `${year}-Q${q}`;
    }
    if (frequency === 'HALF_YEARLY') {
      const h = month <= 6 ? 1 : 2;
      return `${year}-H${h}`;
    }
    if (frequency === 'WEEKLY') {
      const dayOfYear = Math.floor(
        (referenceDate.getTime() - Date.UTC(year, 0, 1)) / 86400000,
      );
      const week = Math.max(1, Math.ceil((dayOfYear + 1) / 7));
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    // ANNUAL / CUSTOM
    const fyStart = month >= 4 ? year : year - 1;
    return `FY${fyStart}-${String(fyStart + 1).slice(-2)}`;
  }

  computeDueDate(rule: DueDateRuleDef | null | undefined, period: string): string {
    const now = new Date();
    const ym = period.match(/^(\d{4})-(\d{2})$/);
    const yq = period.match(/^(\d{4})-Q([1-4])$/);
    const fy = period.match(/^FY(\d{4})-/);

    let periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    let periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    if (ym) {
      const y = Number(ym[1]);
      const m = Number(ym[2]) - 1;
      periodStart = new Date(Date.UTC(y, m, 1));
      periodEnd = new Date(Date.UTC(y, m + 1, 0));
    } else if (yq) {
      const y = Number(yq[1]);
      const q = Number(yq[2]);
      const startM = (q - 1) * 3;
      periodStart = new Date(Date.UTC(y, startM, 1));
      periodEnd = new Date(Date.UTC(y, startM + 3, 0));
    } else if (fy) {
      const y = Number(fy[1]);
      periodStart = new Date(Date.UTC(y, 3, 1)); // Apr 1
      periodEnd = new Date(Date.UTC(y + 1, 2, 31)); // Mar 31
    }

    if (rule?.basis === 'fixed_date' && rule.fixedMonth && rule.fixedDay) {
      const baseYear = fy ? Number(fy[1]) + (rule.fixedMonth <= 3 ? 1 : 0) : now.getUTCFullYear();
      const d = new Date(Date.UTC(baseYear, rule.fixedMonth - 1, rule.fixedDay));
      return d.toISOString().slice(0, 10);
    }

    const base = rule?.basis === 'period_start' ? periodStart : periodEnd;
    const offset = rule?.offsetDays ?? 20;
    const due = new Date(base.getTime() + offset * 86400000);
    return due.toISOString().slice(0, 10);
  }

  async spawnDueJobsFromClientServices(tenantId: string, overridePeriod?: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const mappings = await qr.manager.find(ClientServiceOrmEntity, {
        where: { tenantId, isActive: true },
        relations: ['serviceType', 'client', 'client.company'],
      });

      const jobRepo = qr.manager.getRepository(PracticeJobOrmEntity);
      const today = new Date().toISOString().slice(0, 10);
      let spawnedCount = 0;
      let skippedCount = 0;
      const spawnedJobs: PracticeJobOrmEntity[] = [];

      for (const m of mappings) {
        const svc = m.serviceType;
        if (!svc || !svc.isActive) continue;
        if (svc.frequency === 'ONE_TIME') {
          skippedCount++;
          continue;
        }
        if (m.endDate && m.endDate < today) {
          skippedCount++;
          continue;
        }

        const period = overridePeriod?.trim() || this.computePeriodForFrequency(svc.frequency);
        const existing = await jobRepo.findOne({
          where: {
            tenantId,
            clientId: m.clientId,
            serviceTypeId: svc.id,
            period,
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const stages = (m.customStages?.length ? m.customStages : svc.defaultStages) || STANDARD_STAGES;
        const firstStage = stages[0]?.key || 'BACKLOG';
        const dueDate = this.computeDueDate(m.customDueRule || svc.defaultDueDateRule, period);
        const checklist = (svc.defaultChecklist || []).map((c, idx) => ({
          id: c.id || `chk-${idx}`,
          title: c.title,
          stage: c.stage || firstStage,
          completed: false,
        }));

        const clientName = m.client?.company?.legalName || m.client?.primaryContactName || 'Client';
        const job = jobRepo.create({
          tenantId,
          clientId: m.clientId,
          serviceTypeId: svc.id,
          templateId: null,
          title: `${svc.name} — ${clientName} (${period})`,
          jobType: svc.code,
          period,
          stage: firstStage,
          priority: svc.defaultPriority || 'MEDIUM',
          dueDate,
          assignedToUserId: m.assignedStaffId || null,
          isRecurring: true,
          recurrenceFrequency: svc.frequency,
          stages,
          checklist,
          customFields: {},
          labels: [],
        });

        const saved = await jobRepo.save(job);
        spawnedJobs.push(saved);
        spawnedCount++;
      }

      return { spawnedCount, skippedCount, spawnedJobs };
    });
  }

  // ==================== CLIENT MASTER EXTENSIONS ====================

  async updateClientDetails(
    tenantId: string,
    clientId: string,
    patch: Partial<{
      primaryContactName: string;
      primaryContactEmail: string;
      primaryContactPhone: string | null;
      engagementType: any;
      serviceTier: any;
      healthStatus: any;
      isPortalEnabled: boolean;
      entityType: string;
      incorporationDate: string | null;
      cin: string | null;
      tan: string | null;
      aadhaarMasked: string | null;
      registeredAddress: string | null;
      gstins: string[];
      fyPreference: string;
      isVip: boolean;
      assignedPartnerId: string | null;
      customFields: Record<string, any>;
      labels: string[];
    }>,
  ) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(FirmClientOrmEntity);
      const client = await repo.findOne({ where: { id: clientId, tenantId } });
      if (!client) throw new NotFoundException('Client not found');

      if (patch.primaryContactName !== undefined) client.primaryContactName = patch.primaryContactName;
      if (patch.primaryContactEmail !== undefined) client.primaryContactEmail = patch.primaryContactEmail;
      if (patch.primaryContactPhone !== undefined) client.primaryContactPhone = patch.primaryContactPhone;
      if (patch.engagementType !== undefined) client.engagementType = patch.engagementType;
      if (patch.serviceTier !== undefined) client.serviceTier = patch.serviceTier;
      if (patch.healthStatus !== undefined) client.healthStatus = patch.healthStatus;
      if (patch.isPortalEnabled !== undefined) client.isPortalEnabled = patch.isPortalEnabled;
      if (patch.entityType !== undefined) client.entityType = patch.entityType;
      if (patch.incorporationDate !== undefined) client.incorporationDate = patch.incorporationDate;
      if (patch.cin !== undefined) client.cin = patch.cin;
      if (patch.tan !== undefined) client.tan = patch.tan;
      if (patch.aadhaarMasked !== undefined) {
        const raw = (patch.aadhaarMasked || '').replace(/\D/g, '');
        client.aadhaarMasked =
          raw.length >= 4 ? `XXXX-XXXX-${raw.slice(-4)}` : patch.aadhaarMasked || null;
      }
      if (patch.registeredAddress !== undefined) client.registeredAddress = patch.registeredAddress;
      if (patch.gstins !== undefined) client.gstins = patch.gstins;
      if (patch.fyPreference !== undefined) client.fyPreference = patch.fyPreference;
      if (patch.isVip !== undefined) client.isVip = patch.isVip;
      if (patch.assignedPartnerId !== undefined) client.assignedPartnerId = patch.assignedPartnerId;
      if (patch.customFields !== undefined) client.customFields = patch.customFields;
      if (patch.labels !== undefined) client.labels = patch.labels;

      return await repo.save(client);
    });
  }

  // ==================== CREDENTIALS VAULT ====================

  async listCredentials(tenantId: string, clientId: string, role: string) {
    if (role === 'CLIENT_VIEWER') {
      throw new ForbiddenException('Client portal users cannot access the firm credential vault');
    }
    return await this.uow.executeInTransaction(async (qr) => {
      const creds = await qr.manager.find(ClientCredentialOrmEntity, {
        where: { tenantId, clientId },
        order: { createdAt: 'DESC' },
      });
      return creds.map((c) => ({
        id: c.id,
        clientId: c.clientId,
        label: c.label,
        portalType: c.portalType,
        username: c.username,
        passwordMasked: '••••••••',
        url: c.url,
        notes: c.notes,
        lastUpdatedByUserId: c.lastUpdatedByUserId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));
    });
  }

  async upsertCredential(
    tenantId: string,
    userId: string,
    role: string,
    clientId: string,
    dto: {
      id?: string;
      label: string;
      portalType: string;
      username: string;
      password?: string;
      url?: string | null;
      notes?: string | null;
    },
  ) {
    if (role === 'CLIENT_VIEWER') {
      throw new ForbiddenException('Client portal users cannot modify firm credentials');
    }
    if (!dto.label?.trim() || !dto.username?.trim()) {
      throw new BadRequestException('Label and username are required');
    }

    return await this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: clientId, tenantId },
      });
      if (!client) throw new NotFoundException('Client not found');

      const repo = qr.manager.getRepository(ClientCredentialOrmEntity);
      let cred: ClientCredentialOrmEntity | null = null;
      const isCreate = !dto.id;

      if (dto.id) {
        cred = await repo.findOne({ where: { id: dto.id, tenantId, clientId } });
        if (!cred) throw new NotFoundException('Credential not found');
        cred.label = dto.label.trim();
        cred.portalType = dto.portalType || cred.portalType;
        cred.username = dto.username.trim();
        if (dto.password) cred.passwordEncrypted = dto.password;
        if (dto.url !== undefined) cred.url = dto.url;
        if (dto.notes !== undefined) cred.notes = dto.notes;
        cred.lastUpdatedByUserId = userId;
      } else {
        if (!dto.password) throw new BadRequestException('Password is required when creating a credential');
        cred = repo.create({
          tenantId,
          clientId,
          label: dto.label.trim(),
          portalType: dto.portalType || 'GST',
          username: dto.username.trim(),
          passwordEncrypted: dto.password,
          url: dto.url || null,
          notes: dto.notes || null,
          lastUpdatedByUserId: userId,
        });
      }

      const saved = await repo.save(cred);

      const auditRepo = qr.manager.getRepository(AuditLogOrmEntity);
      const auditPayload = {
        clientId,
        label: saved.label,
        portalType: saved.portalType,
        username: saved.username,
      };
      await auditRepo.save(
        auditRepo.create({
          tenantId,
          companyId: client.companyId,
          actorId: userId,
          entityType: 'CLIENT_CREDENTIAL',
          entityId: saved.id,
          action: isCreate ? 'CREATE_CREDENTIAL' : 'UPDATE_CREDENTIAL',
          payloadAfter: auditPayload,
          recordHash: this.buildHash({ actorId: userId, entityId: saved.id, ...auditPayload }),
        }),
      );

      return {
        id: saved.id,
        clientId: saved.clientId,
        label: saved.label,
        portalType: saved.portalType,
        username: saved.username,
        passwordMasked: '••••••••',
        url: saved.url,
        notes: saved.notes,
        updatedAt: saved.updatedAt,
      };
    });
  }

  async revealCredential(tenantId: string, userId: string, role: string, credId: string) {
    if (role === 'CLIENT_VIEWER') {
      throw new ForbiddenException('Client portal users cannot reveal firm credentials');
    }
    return await this.uow.executeInTransaction(async (qr) => {
      const cred = await qr.manager.findOne(ClientCredentialOrmEntity, {
        where: { id: credId, tenantId },
        relations: ['client'],
      });
      if (!cred) throw new NotFoundException('Credential not found');

      const auditRepo = qr.manager.getRepository(AuditLogOrmEntity);
      const payload = {
        clientId: cred.clientId,
        label: cred.label,
        portalType: cred.portalType,
        revealedAt: new Date().toISOString(),
      };
      await auditRepo.save(
        auditRepo.create({
          tenantId,
          companyId: cred.client?.companyId ?? null,
          actorId: userId,
          entityType: 'CLIENT_CREDENTIAL',
          entityId: cred.id,
          action: 'REVEAL_CREDENTIAL',
          payloadAfter: payload,
          recordHash: this.buildHash({ actorId: userId, entityId: cred.id, ...payload }),
        }),
      );

      return {
        id: cred.id,
        label: cred.label,
        portalType: cred.portalType,
        username: cred.username,
        password: cred.passwordEncrypted,
      };
    });
  }

  async deleteCredential(tenantId: string, userId: string, role: string, credId: string) {
    if (role === 'CLIENT_VIEWER') {
      throw new ForbiddenException('Client portal users cannot delete firm credentials');
    }
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(ClientCredentialOrmEntity);
      const cred = await repo.findOne({
        where: { id: credId, tenantId },
        relations: ['client'],
      });
      if (!cred) throw new NotFoundException('Credential not found');

      const auditRepo = qr.manager.getRepository(AuditLogOrmEntity);
      await auditRepo.save(
        auditRepo.create({
          tenantId,
          companyId: cred.client?.companyId ?? null,
          actorId: userId,
          entityType: 'CLIENT_CREDENTIAL',
          entityId: cred.id,
          action: 'DELETE_CREDENTIAL',
          payloadBefore: { clientId: cred.clientId, label: cred.label, portalType: cred.portalType },
          recordHash: this.buildHash({ actorId: userId, entityId: cred.id, action: 'DELETE_CREDENTIAL' }),
        }),
      );

      await repo.remove(cred);
      return { deleted: true, id: credId };
    });
  }

  async getCredentialAudit(tenantId: string, clientId: string, role: string) {
    if (role === 'CLIENT_VIEWER') {
      throw new ForbiddenException('Access denied');
    }
    return await this.uow.executeInTransaction(async (qr) => {
      return await qr.manager.query(
        `SELECT id, actor_id AS "actorId", entity_id AS "entityId", action, payload_after AS "payload", created_at AS "createdAt"
         FROM audit_logs
         WHERE tenant_id = $1 AND entity_type = 'CLIENT_CREDENTIAL'
           AND (payload_after->>'clientId' = $2 OR payload_before->>'clientId' = $2)
         ORDER BY created_at DESC
         LIMIT 50`,
        [tenantId, clientId],
      );
    });
  }

  // ==================== CUSTOM FIELDS & LABELS ====================

  async listCustomFields(tenantId: string, entityType?: 'CLIENT' | 'JOB') {
    return await this.uow.executeInTransaction(async (qr) => {
      const where: any = { tenantId };
      if (entityType) where.entityType = entityType;
      return await qr.manager.find(PracticeCustomFieldOrmEntity, {
        where,
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    });
  }

  async createCustomField(
    tenantId: string,
    dto: {
      entityType: 'CLIENT' | 'JOB';
      label: string;
      fieldKey?: string;
      fieldType?: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
      options?: string[];
      isRequired?: boolean;
      sortOrder?: number;
    },
  ) {
    if (!dto.label?.trim()) throw new BadRequestException('Field label is required');
    const key =
      dto.fieldKey?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
      dto.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeCustomFieldOrmEntity);
      const field = repo.create({
        tenantId,
        entityType: dto.entityType || 'CLIENT',
        fieldKey: key,
        label: dto.label.trim(),
        fieldType: dto.fieldType || 'text',
        options: dto.options || [],
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
      });
      return await repo.save(field);
    });
  }

  async deleteCustomField(tenantId: string, id: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeCustomFieldOrmEntity);
      const field = await repo.findOne({ where: { id, tenantId } });
      if (!field) throw new NotFoundException('Custom field not found');
      await repo.remove(field);
      return { deleted: true, id };
    });
  }

  async listLabels(tenantId: string, entityType?: 'CLIENT' | 'JOB' | 'ALL') {
    return await this.uow.executeInTransaction(async (qr) => {
      const all = await qr.manager.find(PracticeLabelOrmEntity, {
        where: { tenantId },
        order: { name: 'ASC' },
      });
      if (!entityType || entityType === 'ALL') return all;
      return all.filter((l) => l.entityType === 'ALL' || l.entityType === entityType);
    });
  }

  async createLabel(
    tenantId: string,
    dto: { name: string; color?: string; entityType?: 'CLIENT' | 'JOB' | 'ALL' },
  ) {
    if (!dto.name?.trim()) throw new BadRequestException('Label name is required');
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeLabelOrmEntity);
      const label = repo.create({
        tenantId,
        name: dto.name.trim(),
        color: dto.color || 'brand',
        entityType: dto.entityType || 'ALL',
      });
      return await repo.save(label);
    });
  }

  async deleteLabel(tenantId: string, id: string) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeLabelOrmEntity);
      const label = await repo.findOne({ where: { id, tenantId } });
      if (!label) throw new NotFoundException('Label not found');
      await repo.remove(label);
      return { deleted: true, id };
    });
  }

  async updateJobCustomData(
    tenantId: string,
    jobId: string,
    dto: { customFields?: Record<string, any>; labels?: string[] },
  ) {
    return await this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeJobOrmEntity);
      const job = await repo.findOne({ where: { id: jobId, tenantId } });
      if (!job) throw new NotFoundException('Job not found');
      if (dto.customFields !== undefined) job.customFields = dto.customFields;
      if (dto.labels !== undefined) job.labels = dto.labels;
      return await repo.save(job);
    });
  }
}
