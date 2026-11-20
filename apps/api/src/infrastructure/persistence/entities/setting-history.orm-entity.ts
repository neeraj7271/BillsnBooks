import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SettingScope } from '@platform/shared-types';

@Entity('setting_history')
@Index('idx_setting_history_key', ['settingKey', 'scope', 'scopeId', 'createdAt'])
export class SettingHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'setting_key', type: 'varchar', length: 128 })
  settingKey!: string;

  @Column({
    type: 'enum',
    enum: SettingScope,
  })
  scope!: SettingScope;

  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId!: string | null;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: any;

  @Column({ name: 'new_value', type: 'jsonb' })
  newValue!: any;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy!: string | null;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

