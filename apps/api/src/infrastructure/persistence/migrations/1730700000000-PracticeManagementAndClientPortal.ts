import { MigrationInterface, QueryRunner } from 'typeorm';

export class PracticeManagementAndClientPortal1730700000000 implements MigrationInterface {
  name = 'PracticeManagementAndClientPortal1730700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. firm_clients
    await queryRunner.query(`
      CREATE TABLE firm_clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_code VARCHAR(50) NOT NULL,
        primary_contact_name VARCHAR(255) NOT NULL,
        primary_contact_email VARCHAR(255) NOT NULL,
        primary_contact_phone VARCHAR(50) NULL,
        engagement_type VARCHAR(50) NOT NULL DEFAULT 'RETAINER',
        service_tier VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
        is_portal_enabled BOOLEAN NOT NULL DEFAULT true,
        health_status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_tenant_company_client UNIQUE(tenant_id, company_id),
        CONSTRAINT uq_tenant_client_code UNIQUE(tenant_id, client_code)
      );
      CREATE INDEX idx_firm_clients_tenant_id ON firm_clients(tenant_id);
      CREATE INDEX idx_firm_clients_company_id ON firm_clients(company_id);
      CREATE INDEX idx_firm_clients_health ON firm_clients(health_status);
    `);

    // 2. staff_assignments
    await queryRunner.query(`
      CREATE TABLE staff_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'SENIOR_ACCOUNTANT',
        is_lead BOOLEAN NOT NULL DEFAULT false,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_client_staff_assignment UNIQUE(client_id, user_id)
      );
      CREATE INDEX idx_staff_assignments_tenant_id ON staff_assignments(tenant_id);
      CREATE INDEX idx_staff_assignments_client_id ON staff_assignments(client_id);
      CREATE INDEX idx_staff_assignments_user_id ON staff_assignments(user_id);
    `);

    // 3. compliance_tasks
    await queryRunner.query(`
      CREATE TABLE compliance_tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'GST',
        statutory_period VARCHAR(50) NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
        priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        assigned_to_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        filing_acknowledgment_number VARCHAR(100) NULL,
        completed_at TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_compliance_tasks_tenant_id ON compliance_tasks(tenant_id);
      CREATE INDEX idx_compliance_tasks_client_id ON compliance_tasks(client_id);
      CREATE INDEX idx_compliance_tasks_status ON compliance_tasks(status);
      CREATE INDEX idx_compliance_tasks_due_date ON compliance_tasks(due_date);
      CREATE INDEX idx_compliance_tasks_assigned_to ON compliance_tasks(assigned_to_user_id);
    `);

    // 4. task_comments
    await queryRunner.query(`
      CREATE TABLE task_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        task_id UUID NOT NULL REFERENCES compliance_tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        is_internal_only BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_task_comments_tenant_id ON task_comments(tenant_id);
      CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
    `);

    // 5. client_document_requests
    await queryRunner.query(`
      CREATE TABLE client_document_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        document_type VARCHAR(50) NOT NULL DEFAULT 'BANK_STATEMENT',
        period VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
        due_date DATE NULL,
        file_url VARCHAR(1024) NULL,
        file_name VARCHAR(255) NULL,
        file_size_bytes BIGINT NULL,
        rejection_reason TEXT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_doc_requests_tenant_id ON client_document_requests(tenant_id);
      CREATE INDEX idx_doc_requests_client_id ON client_document_requests(client_id);
      CREATE INDEX idx_doc_requests_status ON client_document_requests(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client_document_requests CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_comments CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_tasks CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS staff_assignments CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS firm_clients CASCADE;`);
  }
}

