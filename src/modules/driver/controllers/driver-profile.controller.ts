import {
  Controller, Get, Put, Body, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { DriverProfileService } from '../services/driver-profile.service';
import { UpdateFcmTokenDto } from '../../../common/dto';

@ApiTags('Driver — Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver/profile')
export class DriverProfileController {
  constructor(private readonly profileService: DriverProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get driver profile' })
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getProfile(user.sub);
  }

  @Put('picture')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  updatePicture(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.updateProfilePicture(user.sub, file);
  }

  @Put('fcm-token')
  @ApiOperation({ summary: 'Register/update FCM device token for push notifications' })
  updateFcmToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.profileService.updateFcmToken(user.sub, dto.fcmToken);
  }
}
