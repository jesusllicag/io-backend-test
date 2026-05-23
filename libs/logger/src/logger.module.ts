import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { buildLoggerConfig } from './logger.config';

@Module({})
export class AppLoggerModule {
  static forService(serviceName: string): DynamicModule {
    return {
      module: AppLoggerModule,
      imports: [PinoLoggerModule.forRoot(buildLoggerConfig(serviceName))],
      exports: [PinoLoggerModule],
    };
  }
}
