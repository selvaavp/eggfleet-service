import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { ErrorCodes } from '../../../common/constants/error-codes.constant';
import { todayIST } from '../../../common/utils/date.util';
import { validateImageMimetype, toPublicUrl } from '../../../common/utils/upload.util';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class DriverProfileService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(VanAssignment) private readonly assignmentRepo: Repository<VanAssignment>,
  ) {}

  async getProfile(driverId: string) {
    const user = await this.userRepo.findOne({ where: { id: driverId } });
    if (!user) throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: 'User not found' });

    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: todayIST(), status: VanAssignmentStatus.ACTIVE },
      relations: ['van'],
    });

    return {
      message: 'Profile fetched',
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        profilePictureUrl: user.profilePictureUrl,
        assignedVan: assignment?.van
          ? { id: assignment.van.id, number: assignment.van.vanNumber, name: assignment.van.name }
          : null,
        joiningDate: user.createdAt ? user.createdAt.toISOString().split('T')[0] : null,
      },
    };
  }

  async updateProfilePicture(driverId: string, file: Express.Multer.File) {
    validateImageMimetype(file, 2);

    const uploadDir = path.join(process.env.UPLOAD_DIR ?? './uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const profilePictureUrl = `/uploads/profiles/${filename}`;
    await this.userRepo.update(driverId, { profilePictureUrl });

    return { message: 'Profile picture updated', data: { profilePictureUrl } };
  }

  async updateFcmToken(driverId: string, fcmToken: string) {
    await this.userRepo.update(driverId, { fcmToken });
    return { message: 'FCM token updated' };
  }
}
