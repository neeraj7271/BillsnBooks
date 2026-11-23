import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsString()
  tenantName?: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  accountType?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}


export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
