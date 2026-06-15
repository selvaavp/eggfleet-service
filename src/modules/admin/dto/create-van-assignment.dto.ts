import { IsUUID, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVanAssignmentDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() driverId: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() vanId: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() routeId: string;
  @ApiProperty() @IsDateString() assignedDate: string;
  @ApiProperty({ description: 'Admin user ID creating this assignment' }) @IsUUID() @IsNotEmpty() createdBy: string;
}
