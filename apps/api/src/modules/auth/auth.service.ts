import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { UserRole } from '@platform/shared-types';
import {
  getRequiredJwtSecret,
  getRequiredJwtRefreshSecret,
} from '../../common/config/secrets';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  /**
   * Best-effort in-memory brute-force throttle for login. Keyed by lowercased
   * email. This mitigates credential-stuffing against a single process; a
   * production deployment behind multiple instances should back this with a
   * shared store (Redis) or an edge rate limiter.
   */
  private static readonly loginAttempts = new Map<
    string,
    { count: number; firstAt: number; lockedUntil?: number }
  >();
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOGIN_WINDOW_MS = 15 * 60 * 1000;
  private static readonly LOGIN_LOCK_MS = 15 * 60 * 1000;

  private assertLoginAllowed(email: string): void {
    const rec = AuthService.loginAttempts.get(email);
    if (rec?.lockedUntil && rec.lockedUntil > Date.now()) {
      const secs = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
      throw new HttpException(
        `Too many failed login attempts. Try again in ${secs} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordLoginFailure(email: string): void {
    const now = Date.now();
    const rec = AuthService.loginAttempts.get(email);
    if (!rec || now - rec.firstAt > AuthService.LOGIN_WINDOW_MS) {
      AuthService.loginAttempts.set(email, { count: 1, firstAt: now });
      return;
    }
    rec.count += 1;
    if (rec.count >= AuthService.MAX_LOGIN_ATTEMPTS) {
      rec.lockedUntil = now + AuthService.LOGIN_LOCK_MS;
    }
  }

  private clearLoginFailures(email: string): void {
    AuthService.loginAttempts.delete(email);
  }

  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: Partial<UserOrmEntity>; tokens: AuthTokens }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [{ exists }] = await queryRunner.query(
        `SELECT auth_email_exists($1) AS exists`,
        [dto.email.toLowerCase()],
      );
      if (exists) {
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

      // Bind RLS tenant context before inserting/updating the user row
      await queryRunner.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenant.id]);

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
      user.role = UserRole.FIRM_PARTNER;  // tenant owner, NOT platform SUPER_ADMIN
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

  private mapRawUser(row: any): UserOrmEntity {
    const user = new UserOrmEntity();
    user.id = row.id;
    user.tenantId = row.tenant_id;
    user.email = row.email;
    user.passwordHash = row.password_hash;
    user.firstName = row.first_name;
    user.lastName = row.last_name;
    user.role = row.role;
    user.isActive = row.is_active;
    user.refreshTokenHash = row.refresh_token_hash;
    return user;
  }

  private async findUserByEmailCrossTenant(email: string): Promise<UserOrmEntity | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM auth_find_user_by_email($1)`,
      [email.toLowerCase()],
    );
    return rows.length > 0 ? this.mapRawUser(rows[0]) : null;
  }

  private async findUserByIdCrossTenant(userId: string): Promise<UserOrmEntity | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM auth_find_user_by_id($1)`,
      [userId],
    );
    return rows.length > 0 ? this.mapRawUser(rows[0]) : null;
  }

  private async updateRefreshTokenForTenant(
    tenantId: string,
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
      await qr.manager.update(UserOrmEntity, { id: userId }, { refreshTokenHash });
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async login(dto: LoginDto): Promise<{ user: Partial<UserOrmEntity>; tokens: AuthTokens }> {
    const email = dto.email.toLowerCase();
    this.assertLoginAllowed(email);

    const user = await this.findUserByEmailCrossTenant(email);

    if (!user || !user.isActive) {
      this.recordLoginFailure(email);
      throw new UnauthorizedException('Invalid credentials or account inactive');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      this.recordLoginFailure(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.clearLoginFailures(email);

    const tokens = await this.generateTokens(user);
    const refreshHash = await argon2.hash(tokens.refreshToken);
    await this.updateRefreshTokenForTenant(user.tenantId, user.id, refreshHash);

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
    const user = await this.findUserByIdCrossTenant(userId);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const isMatch = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const refreshHash = await argon2.hash(tokens.refreshToken);
    await this.updateRefreshTokenForTenant(user.tenantId, user.id, refreshHash);

    return tokens;
  }

  async refreshFromToken(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getRequiredJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.refreshTokens(payload.sub, refreshToken);
  }

  async logout(userId: string): Promise<void> {
    const user = await this.findUserByIdCrossTenant(userId);
    if (user) {
      await this.updateRefreshTokenForTenant(user.tenantId, user.id, null);
    }
  }

  private async generateTokens(user: UserOrmEntity): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getRequiredJwtSecret(),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: getRequiredJwtRefreshSecret(),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}

