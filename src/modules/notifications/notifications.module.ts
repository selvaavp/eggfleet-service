import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { FirebaseService } from './firebase/firebase.service';
import { Notification } from '../../database/entities/notification.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  providers: [NotificationsService, FirebaseService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
