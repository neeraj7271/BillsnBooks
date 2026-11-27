import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('practice_custom_fields')
export class PracticeCustomFieldOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType!: 'CLIENT' | 'JOB';

  @Column({ name: 'field_key', type: 'varchar', length: 80 })
  fieldKey!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ name: 'field_type', type: 'varchar', length: 30, default: 'text' })
  fieldType!: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

  @Column({ type: 'jsonb', default: () => "'[]'" })
  options!: string[];

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
