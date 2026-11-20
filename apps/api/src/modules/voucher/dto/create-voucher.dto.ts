import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherType, EntryType } from '@platform/shared-types';

export class JournalEntryInputDto {
  @IsUUID()
  ledgerId!: string;

  @IsEnum(EntryType)
  entryType!: EntryType;

  @IsNotEmpty()
  @IsString()
  amount!: string; // Decimal string (e.g. "1000.50")

  @IsOptional()
  @IsString()
  narration?: string;
}

export class CreateVoucherDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  financialYearId!: string;

  @IsEnum(VoucherType)
  voucherType!: VoucherType;

  @IsOptional()
  @IsString()
  series?: string;

  @IsDateString()
  voucherDate!: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryInputDto)
  entries!: JournalEntryInputDto[];
}

