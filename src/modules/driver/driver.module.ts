import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from '../../database/entities/delivery.entity';
import { DeliveryItem } from '../../database/entities/delivery-item.entity';
import { VanAssignment } from '../../database/entities/van-assignment.entity';
import { VanLoad } from '../../database/entities/van-load.entity';
import { Store } from '../../database/entities/store.entity';
import { Payment } from '../../database/entities/payment.entity';
import { PaymentDelivery } from '../../database/entities/payment-delivery.entity';
import { Handover } from '../../database/entities/handover.entity';
import { HandoverEggItem } from '../../database/entities/handover-egg-item.entity';
import { User } from '../../database/entities/user.entity';
import { DriverDashboardController } from './controllers/driver-dashboard.controller';
import { DriverDeliveriesController } from './controllers/driver-deliveries.controller';
import { DriverPaymentsController } from './controllers/driver-payments.controller';
import { DriverHandoversController } from './controllers/driver-handovers.controller';
import { DriverNotificationsController } from './controllers/driver-notifications.controller';
import { DriverProfileController } from './controllers/driver-profile.controller';
import { DriverDashboardService } from './services/driver-dashboard.service';
import { DriverDeliveriesService } from './services/driver-deliveries.service';
import { DriverPaymentsService } from './services/driver-payments.service';
import { DriverHandoversService } from './services/driver-handovers.service';
import { DriverProfileService } from './services/driver-profile.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Delivery, DeliveryItem, VanAssignment, VanLoad,
      Store, Payment, PaymentDelivery, Handover,
      HandoverEggItem, User,
    ]),
    NotificationsModule,
  ],
  controllers: [
    DriverDashboardController,
    DriverDeliveriesController,
    DriverPaymentsController,
    DriverHandoversController,
    DriverNotificationsController,
    DriverProfileController,
  ],
  providers: [
    DriverDashboardService,
    DriverDeliveriesService,
    DriverPaymentsService,
    DriverHandoversService,
    DriverProfileService,
  ],
})
export class DriverModule {}
