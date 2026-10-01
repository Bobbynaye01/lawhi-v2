import { Module } from '@nestjs/common';
import { AdminConfigController, DonationConfigService } from './admin-config.controller';
import { AdminDonationsController } from './admin-donations.controller';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  controllers: [DonationsController, AdminDonationsController, AdminConfigController],
  providers: [DonationsService, DonationConfigService],
})
export class DonationsModule {}
