import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CompanyOrmEntity } from './company.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

@Entity('tenants')
export class TenantOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 50, default: 'STARTER' })
  plan!: string;

  @Column({ name: 'practice_mode', type: 'varchar', length: 20, default: 'FIRM' })
  practiceMode!: 'FIRM' | 'BUSINESS';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => CompanyOrmEntity, (company) => company.tenant)
  companies!: CompanyOrmEntity[];

  @OneToMany(() => UserOrmEntity, (user) => user.tenant)
  users!: UserOrmEntity[];
}

