import '../../common/config/load-env';
import { DataSource } from 'typeorm';
import { TenantOrmEntity } from './entities/tenant.orm-entity';
import { UserOrmEntity } from './entities/user.orm-entity';
import { CompanyOrmEntity } from './entities/company.orm-entity';
import { BranchOrmEntity } from './entities/branch.orm-entity';
import { FinancialYearOrmEntity } from './entities/financial-year.orm-entity';
import { AccountingPeriodOrmEntity } from './entities/accounting-period.orm-entity';
import { LedgerGroupOrmEntity } from './entities/ledger-group.orm-entity';
import { LedgerOrmEntity } from './entities/ledger.orm-entity';
import { VoucherSequenceOrmEntity } from './entities/voucher-sequence.orm-entity';
import { VoucherOrmEntity } from './entities/voucher.orm-entity';
import { JournalEntryOrmEntity } from './entities/journal-entry.orm-entity';
import { OutboxOrmEntity } from './entities/outbox.orm-entity';
import { AuditLogOrmEntity } from './entities/audit-log.orm-entity';
import { TallyConnectorOrmEntity } from './entities/tally-connector.orm-entity';
import { ImportBatchOrmEntity } from './entities/import-batch.orm-entity';
import { ImportRowOrmEntity } from './entities/import-row.orm-entity';
import { TallyMasterOrmEntity } from './entities/tally-master.orm-entity';
import { TallyPostingLogOrmEntity } from './entities/tally-posting-log.orm-entity';
import { BankAccountOrmEntity } from './entities/bank-account.orm-entity';
import { BankStatementOrmEntity } from './entities/bank-statement.orm-entity';
import { BankTransactionOrmEntity } from './entities/bank-transaction.orm-entity';
import { BankReconciliationItemOrmEntity } from './entities/bank-reconciliation-item.orm-entity';
import { SalesDiscoveryTicketOrmEntity } from './entities/sales-discovery-ticket.orm-entity';
import { PartyOrmEntity } from './entities/party.orm-entity';
import { ItemOrmEntity } from './entities/item.orm-entity';
import { InvoiceOrmEntity } from './entities/invoice.orm-entity';
import { InvoiceItemOrmEntity } from './entities/invoice-item.orm-entity';
import { ApprovalRequestOrmEntity } from './entities/approval-request.orm-entity';
import { NotificationOrmEntity } from './entities/notification.orm-entity';
import { FirmClientOrmEntity } from './entities/firm-client.orm-entity';
import { StaffAssignmentOrmEntity } from './entities/staff-assignment.orm-entity';
import { ComplianceTaskOrmEntity } from './entities/compliance-task.orm-entity';
import { TaskCommentOrmEntity } from './entities/task-comment.orm-entity';
import { ClientDocumentRequestOrmEntity } from './entities/client-document-request.orm-entity';
import { DocumentFolderOrmEntity } from './entities/document-folder.orm-entity';
import { DocumentFileOrmEntity } from './entities/document-file.orm-entity';
import { WorkflowTemplateOrmEntity } from './entities/workflow-template.orm-entity';
import { PracticeJobOrmEntity } from './entities/practice-job.orm-entity';
import { PracticeJobCommentOrmEntity } from './entities/practice-job-comment.orm-entity';
import { ClientContactOrmEntity } from './entities/client-contact.orm-entity';
import { PracticeTimeEntryOrmEntity } from './entities/practice-time-entry.orm-entity';
import { ServiceTypeOrmEntity } from './entities/service-type.orm-entity';
import { ClientServiceOrmEntity } from './entities/client-service.orm-entity';
import { ClientCredentialOrmEntity } from './entities/client-credential.orm-entity';
import { PracticeCustomFieldOrmEntity } from './entities/practice-custom-field.orm-entity';
import { PracticeLabelOrmEntity } from './entities/practice-label.orm-entity';
import { PracticeProposalOrmEntity, PracticeProposalLineOrmEntity } from './entities/practice-proposal.orm-entity';
import { PracticeEngagementTemplateOrmEntity, PracticeEngagementOrmEntity } from './entities/practice-engagement.orm-entity';
import { PracticeBillOrmEntity, PracticeBillLineOrmEntity } from './entities/practice-bill.orm-entity';
import { PracticeNoticeOrmEntity } from './entities/practice-notice.orm-entity';
import { PracticeReminderTemplateOrmEntity, PracticeNotificationRuleOrmEntity } from './entities/practice-reminder.orm-entity';
import { RecurringScheduleOrmEntity } from './entities/recurring-schedule.orm-entity';
import { PaymentLinkOrmEntity } from './entities/payment-link.orm-entity';
import { GatewaySettlementOrmEntity } from './entities/gateway-settlement.orm-entity';
import { CollectionReminderOrmEntity } from './entities/collection-reminder.orm-entity';
import { SettingValueOrmEntity } from './entities/setting-value.orm-entity';
import { SettingHistoryOrmEntity } from './entities/setting-history.orm-entity';
import { DocumentSnapshotOrmEntity } from './entities/document-snapshot.orm-entity';
import { NumberingSeriesOrmEntity } from './entities/numbering-series.orm-entity';
import { NumberAllocationOrmEntity } from './entities/number-allocation.orm-entity';
import { NotificationSettingOrmEntity } from './entities/notification-setting.orm-entity';
import { NotificationDispatchLogOrmEntity } from './entities/notification-dispatch-log.orm-entity';
import { UserFavoriteReportOrmEntity } from './entities/user-favorite-report.orm-entity';
import { ReportShareOrmEntity } from './entities/report-share.orm-entity';
import { PartyRegistrationOrmEntity } from './entities/party-registration.orm-entity';
import { PartyAddressOrmEntity } from './entities/party-address.orm-entity';
import { PartyLedgerLinkOrmEntity } from './entities/party-ledger-link.orm-entity';
import { InitialSchemaAndInvariants1730300000000 } from './migrations/1730300000000-InitialSchemaAndInvariants';
import { TallyAndImportStaging1730400000000 } from './migrations/1730400000000-TallyAndImportStaging';
import { BankReconciliationAndDiscovery1730500000000 } from './migrations/1730500000000-BankReconciliationAndDiscovery';
import { PartyAndItemMastersAndInvoicing1730600000000 } from './migrations/1730600000000-PartyAndItemMastersAndInvoicing';
import { PracticeManagementAndClientPortal1730700000000 } from './migrations/1730700000000-PracticeManagementAndClientPortal';
import { CollectionsAndRecurringInvoices1730800000000 } from './migrations/1730800000000-CollectionsAndRecurringInvoices';
import { InvoiceDocumentTypesAndCollectionsPromise1730900000000 } from './migrations/1730900000000-InvoiceDocumentTypesAndCollectionsPromise';
import { LayeredSettingsAndDocumentSnapshots1731000000000 } from './migrations/1731000000000-LayeredSettingsAndDocumentSnapshots';
import { NumberingSeriesAndAllocations1731100000000 } from './migrations/1731100000000-NumberingSeriesAndAllocations';
import { ChartOfAccountsMetadataAndProtection1731200000000 } from './migrations/1731200000000-ChartOfAccountsMetadataAndProtection';
import { PartyMasterGstIntegrityAndSnapshots1731300000000 } from './migrations/1731300000000-PartyMasterGstIntegrityAndSnapshots';
import { TenantRlsWithCheckAndAuditAppendOnly1731400000000 } from './migrations/1731400000000-TenantRlsWithCheckAndAuditAppendOnly';
import { AuthSecurityDefinerHelpers1731500000000 } from './migrations/1731500000000-AuthSecurityDefinerHelpers';
import { TenantRlsCollectionsAndRemainingTables1731600000000 } from './migrations/1731600000000-TenantRlsCollectionsAndRemainingTables';
import { DocumentVaultAndStorage1731700000000 } from './migrations/1731700000000-DocumentVaultAndStorage';
import { PracticeJobsWorkflowAndClient3601731800000 } from './migrations/1731800000000-PracticeJobsWorkflowAndClient360';
import { PracticePlatformV2Core1731900000000 } from './migrations/1731900000000-PracticePlatformV2Core';
import { PracticePlatformV2Phase21732000000000 } from './migrations/1732000000000-PracticePlatformV2Phase2';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || process.env.USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || undefined,
  database: process.env.DATABASE_NAME || 'accounting_platform',
  synchronize: false, // Strictly false in production and dev
  logging: process.env.NODE_ENV === 'development',
  entities: [
    TenantOrmEntity,
    UserOrmEntity,
    CompanyOrmEntity,
    BranchOrmEntity,
    FinancialYearOrmEntity,
    AccountingPeriodOrmEntity,
    LedgerGroupOrmEntity,
    LedgerOrmEntity,
    VoucherSequenceOrmEntity,
    VoucherOrmEntity,
    JournalEntryOrmEntity,
    OutboxOrmEntity,
    AuditLogOrmEntity,
    TallyConnectorOrmEntity,
    ImportBatchOrmEntity,
    ImportRowOrmEntity,
    TallyMasterOrmEntity,
    TallyPostingLogOrmEntity,
    BankAccountOrmEntity,
    BankStatementOrmEntity,
    BankTransactionOrmEntity,
    BankReconciliationItemOrmEntity,
    SalesDiscoveryTicketOrmEntity,
    PartyOrmEntity,
    ItemOrmEntity,
    InvoiceOrmEntity,
    InvoiceItemOrmEntity,
    ApprovalRequestOrmEntity,
    NotificationOrmEntity,
    NotificationSettingOrmEntity,
    NotificationDispatchLogOrmEntity,
    UserFavoriteReportOrmEntity,
    ReportShareOrmEntity,
    FirmClientOrmEntity,
    StaffAssignmentOrmEntity,
    ComplianceTaskOrmEntity,
    TaskCommentOrmEntity,
    ClientDocumentRequestOrmEntity,
    DocumentFolderOrmEntity,
    DocumentFileOrmEntity,
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
    PracticeProposalOrmEntity,
    PracticeProposalLineOrmEntity,
    PracticeEngagementTemplateOrmEntity,
    PracticeEngagementOrmEntity,
    PracticeBillOrmEntity,
    PracticeBillLineOrmEntity,
    PracticeNoticeOrmEntity,
    PracticeReminderTemplateOrmEntity,
    PracticeNotificationRuleOrmEntity,
    RecurringScheduleOrmEntity,
    PaymentLinkOrmEntity,
    GatewaySettlementOrmEntity,
    CollectionReminderOrmEntity,
    SettingValueOrmEntity,
    SettingHistoryOrmEntity,
    DocumentSnapshotOrmEntity,
    NumberingSeriesOrmEntity,
    NumberAllocationOrmEntity,
    PartyRegistrationOrmEntity,
    PartyAddressOrmEntity,
    PartyLedgerLinkOrmEntity,
  ],
  migrations: [
    InitialSchemaAndInvariants1730300000000,
    TallyAndImportStaging1730400000000,
    BankReconciliationAndDiscovery1730500000000,
    PartyAndItemMastersAndInvoicing1730600000000,
    PracticeManagementAndClientPortal1730700000000,
    CollectionsAndRecurringInvoices1730800000000,
    InvoiceDocumentTypesAndCollectionsPromise1730900000000,
    LayeredSettingsAndDocumentSnapshots1731000000000,
    NumberingSeriesAndAllocations1731100000000,
    ChartOfAccountsMetadataAndProtection1731200000000,
    PartyMasterGstIntegrityAndSnapshots1731300000000,
    TenantRlsWithCheckAndAuditAppendOnly1731400000000,
    AuthSecurityDefinerHelpers1731500000000,
    TenantRlsCollectionsAndRemainingTables1731600000000,
    DocumentVaultAndStorage1731700000000,
    PracticeJobsWorkflowAndClient3601731800000,
    PracticePlatformV2Core1731900000000,
    PracticePlatformV2Phase21732000000000,
  ],
  migrationsRun: false,
});
