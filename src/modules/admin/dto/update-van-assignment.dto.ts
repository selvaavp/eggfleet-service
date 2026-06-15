import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVanAssignmentDto {
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() driverId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() vanId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() routeId?: string;
}
