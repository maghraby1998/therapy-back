import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { UserInputError } from '@nestjs/apollo';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    graphqlUploadExpress({ maxFileSize: 10 * 1024 * 1024, maxFiles: 1 }),
  );

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (errors: any) => {
        const formatErrors = (errors: any[], parentPath = '') => {
          let validations = {};

          errors.forEach((error) => {
            const propertyPath = parentPath
              ? `${parentPath}.${error.property}`
              : error.property;

            // Handle direct constraints
            if (error?.constraints) {
              validations[propertyPath] = Object.values(error.constraints).join(
                ', ',
              );
            }

            // Handle nested validation errors
            if (error?.children && error.children.length > 0) {
              const nestedErrors = formatErrors(error.children, propertyPath);
              validations = { ...validations, ...nestedErrors };
            }
          });

          return validations;
        };

        const validations = formatErrors(errors);

        return new UserInputError('Validation failed', {
          extensions: { validations, category: 'validation' },
        });
      },
    }),
  );

  app.enableCors({
    origin: '*',
    // origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(5000);
}
bootstrap();
