import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { UserRole } from '@platform/shared-types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: Partial<UserOrmEntity>; tokens: AuthTokens }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOne(UserOrmEntity, {
        where: { email: dto.email.toLowerCase() },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Auto-derive tenant name and slug from person's name if not explicitly provided
      const resolvedTenantName =
        dto.tenantName?.trim() ||
        (dto.accountType === 'CA'
          ? `${dto.firstName} ${dto.lastName} & Associates`
          : `${dto.firstName} ${dto.lastName}'s Workspace`);

      let resolvedSlug = dto.tenantSlug?.toLowerCase().trim();
      if (!resolvedSlug) {
        const base = `${dto.firstName}-${dto.lastName}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'workspace';
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        resolvedSlug = `${base}-${randomSuffix}`;
      }

      const existingTenant = await queryRunner.manager.findOne(TenantOrmEntity, {
        where: { slug: resolvedSlug },
      });
      if (existingTenant) {
        resolvedSlug = `${resolvedSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }

      // 1. Create Tenant (Personal umbrella organization)
      const tenant = new TenantOrmEntity();
      tenant.name = resolvedTenantName;
      tenant.slug = resolvedSlug;
      tenant.plan = 'PRO';
      await queryRunner.manager.save(tenant);

      // 2. Hash password with Argon2id
      const passwordHash = await argon2.hash(dto.password, {
        type: argon2.argon2id,
      });

      // 3. Create Root SuperAdmin User
      const user = new UserOrmEntity();
      user.tenantId = tenant.id;
      user.email = dto.email.toLowerCase();
      user.passwordHash = passwordHash;
      user.firstName = dto.firstName;
      user.lastName = dto.lastName;
      user.role = UserRole.SUPER_ADMIN;
      user.isActive = true;
      await queryRunner.manager.save(user);

      // 4. Generate Tokens
      const tokens = await this.generateTokens(user);
      user.refreshTokenHash = await argon2.hash(tokens.refreshToken);
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        tokens,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: LoginDto): Promise<{ user: Partial<UserOrmEntity>; tokens: AuthTokens }> {
    const userRepo = this.dataSource.getRepository(UserOrmEntity);
    const user = await userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or account inactive');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    user.refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await userRepo.save(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const userRepo = this.dataSource.getRepository(UserOrmEntity);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const isMatch = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    user.refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await userRepo.save(user);

    return tokens;
  }

  private async generateTokens(user: UserOrmEntity): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'jwt-accounting-secret-key-32b',
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'jwt-refresh-secret-key-32b',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}

