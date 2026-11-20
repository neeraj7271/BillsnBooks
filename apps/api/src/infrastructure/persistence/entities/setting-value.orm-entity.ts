import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SettingScope } from '@platform/shared-types';

@Entity('setting_values')
@Index('idx_settings_lookup', ['settingKey', 'scope', 'scopeId'])
export class SettingValueOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'setting_key', type: 'varchar', length: 128 })
  settingKey!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: SettingScope,
    default: SettingScope.PLATFORM,
  })
  scope!: SettingScope;

  @Index()
  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId!: string | null;

  @Column({ type: 'jsonb' })
  value!: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;
}

