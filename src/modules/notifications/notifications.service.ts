import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { FirebaseService } from './firebase/firebase.service';
import { buildMeta, normalizePagination } from '../../common/utils/pagination.util';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    });
    const saved = await this.notificationRepo.save(notification);

    // Fire push notification if the user has a registered FCM token
    const user = await this.userRepo.findOne({ where: { id: input.userId } });
    if (user?.fcmToken) {
      const valid = await this.firebaseService.sendToDevice(
        user.fcmToken,
        input.title,
        input.body,
        Object.fromEntries(
          Object.entries(input.data ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      );
      if (!valid) {
        await this.userRepo.update(user.id, { fcmToken: null });
      }
    }

    return saved;
  }

  async updateFcmToken(userId: string, fcmToken: string | null): Promise<void> {
    await this.userRepo.update(userId, { fcmToken });
  }

  /** Create the same notification for every active admin user (e.g. driver activity alerts). */
  async notifyAdmins(input: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    const admins = await this.userRepo.find({ where: { role: Role.ADMIN, isActive: true } });
    await Promise.all(admins.map((admin) => this.create({ ...input, userId: admin.id })));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const { page: p, limit: l } = normalizePagination({ page, limit });

    const [items, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });

    return {
      message: 'Notifications fetched',
      data: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      meta: buildMeta(total, p, l),
    };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepo.update(
      { id: notificationId, userId },
      { isRead: true },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
  }
}
