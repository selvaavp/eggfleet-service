import { IsUUID, IsInt, IsEnum, IsDateString, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DamageReason } from '../../../common/enums/damage-reason.enum';

export class CreateDamagedEggDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  vanAssignmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  inventoryId?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  eggCount: number;

  @ApiProperty({ enum: DamageReason })
  @IsEnum(DamageReason)
  reason: DamageReason;

  @ApiProperty({ description: 'Date of damage (YYYY-MM-DD)' })
  @IsDateString()
  damageDate: string;

  @ApiProperty({ description: 'Time of damage (HH:MM)' })
  @IsString()
  damageTime: string;
}
