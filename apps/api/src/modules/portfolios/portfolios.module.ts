import { Module } from '@nestjs/common';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [PortfoliosController],
  providers: [PortfoliosService],
  exports: [PortfoliosService],
})
export class PortfoliosModule {}