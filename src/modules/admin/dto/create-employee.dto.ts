import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/** Driver: mobile number is required for login; email is optional. */
export class CreateEmployeeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;

  @ApiProperty({ description: '10-digit mobile number (India); primary login identifier for drivers' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone: string;

  @ApiPropertyOptional({ description: 'Optional secondary contact for drivers' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
  @ValidateIf((_, v) => v != null)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Defaults to the phone number when omitted' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Omit to leave unchanged; use null or "" to remove optional email' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return typeof value === 'string' ? value.trim() : value;
  })
  @ValidateIf((_, v) => v != null)
  @IsEmail()
  email?: string | null;
}
