import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

import helmet from 'helmet'
import compression from 'compression'

import { Logger } from 'nestjs-pino'

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    })

    app.useLogger(app.get(Logger))

    app.use(helmet())
    app.use(compression())

    await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
