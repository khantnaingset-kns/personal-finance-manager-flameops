import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Personal Finance Manager API')
    .setDescription(
      'Stage 1 teaching API: create spending categories, add amounts, and list totals. ' +
        'Data is shared by all callers of one running process and resets on restart. ' +
        'Amounts use one implicit currency with two decimal places.',
    )
    .setVersion('0.1.0')
    .addTag('categories', 'Spending categories and their accumulated amounts')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      displayRequestDuration: true,
    },
  });
}
