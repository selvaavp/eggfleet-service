import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Van } from '../../database/entities/van.entity';
import { Route } from '../../database/entities/route.entity';
import { RouteStore } from '../../database/entities/route-store.entity';
import { Store } from '../../database/entities/store.entity';
import { User } from '../../database/entities/user.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { VanLoad } from '../../database/entities/van-load.entity';
import { VanAssignment } from '../../database/entities/van-assignment.entity';
import { Delivery } from '../../database/entities/delivery.entity';
import { DeliveryItem } from '../../database/entities/delivery-item.entity';
import { Payment } from '../../database/entities/payment.entity';
import { PaymentDelivery } from '../../database/entities/payment-delivery.entity';
import { VendorPayment } from '../../database/entities/vendor-payment.entity';
import { Handover } from '../../database/entities/handover.entity';
import { HandoverEggItem } from '../../database/entities/handover-egg-item.entity';
import { DamagedEgg } from '../../database/entities/damaged-egg.entity';
import { Expense } from '../../database/entities/expense.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminVansController } from './controllers/admin-vans.controller';
import { AdminRoutesController } from './controllers/admin-routes.controller';
import { AdminEmployeesController } from './controllers/admin-employees.controller';
import { AdminVendorsController } from './controllers/admin-vendors.controller';
import { AdminStoresController } from './controllers/admin-stores.controller';
import { AdminInventoryController } from './controllers/admin-inventory.controller';
import { AdminAssignmentsController } from './controllers/admin-assignments.controller';
import { AdminHandoversController } from './controllers/admin-handovers.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { AdminDamagedEggsController } from './controllers/admin-damaged-eggs.controller';
import { AdminExpensesController } from './controllers/admin-expenses.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminReportsController } from './controllers/admin-reports.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminVansService } from './services/admin-vans.service';
import { AdminRoutesService } from './services/admin-routes.service';
import { AdminEmployeesService } from './services/admin-employees.service';
import { AdminVendorsService } from './services/admin-vendors.service';
import { AdminStoresService } from './services/admin-stores.service';
import { AdminInventoryService } from './services/admin-inventory.service';
import { AdminAssignmentsService } from './services/admin-assignments.service';
import { AdminHandoversService } from './services/admin-handovers.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminDamagedEggsService } from './services/admin-damaged-eggs.service';
import { AdminExpensesService } from './services/admin-expenses.service';
import { AdminReportsService } from './services/admin-reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Van, Route, RouteStore, Store, User, Vendor,
      Inventory, VanLoad, VanAssignment, Delivery, DeliveryItem,
      Payment, PaymentDelivery, VendorPayment, Handover, HandoverEggItem, DamagedEgg,
      Expense,
    ]),
    NotificationsModule,
  ],
  controllers: [
    AdminDashboardController,
    AdminVansController,
    AdminRoutesController,
    AdminEmployeesController,
    AdminVendorsController,
    AdminStoresController,
    AdminInventoryController,
    AdminAssignmentsController,
    AdminHandoversController,
    AdminPaymentsController,
    AdminDamagedEggsController,
    AdminExpensesController,
    AdminNotificationsController,
    AdminReportsController,
  ],
  providers: [
    AdminDashboardService,
    AdminVansService,
    AdminRoutesService,
    AdminEmployeesService,
    AdminVendorsService,
    AdminStoresService,
    AdminInventoryService,
    AdminAssignmentsService,
    AdminHandoversService,
    AdminPaymentsService,
    AdminDamagedEggsService,
    AdminExpensesService,
    AdminReportsService,
  ],
})
export class AdminModule {}
