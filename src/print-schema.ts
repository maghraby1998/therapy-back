import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

async function bootstrap() {
  const arg = process.argv[2];
  const outputPath = arg
    ? resolve(arg.endsWith('.graphql') ? arg : `${arg}/schema.graphql`)
    : resolve('schema.graphql');

  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const { schema } = app.get(GraphQLSchemaHost);
  const sdl = printSchema(schema);

  writeFileSync(outputPath, sdl);

  console.log(`Schema exported to ${outputPath}`);

  await app.close();
}

bootstrap();
