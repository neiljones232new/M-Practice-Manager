import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
