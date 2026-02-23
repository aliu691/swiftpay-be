import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔐 Capture raw body for Paystack webhook signature verification
  app.use(
    bodyParser.json({
      verify: (req: any, res, buf: Buffer) => {
        if (req.originalUrl.includes('/webhooks/paystack')) {
          req.rawBody = buf;
        }
      },
    }),
  );

  // Enable CORS (needed for Vite frontend later)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
}

bootstrap();
