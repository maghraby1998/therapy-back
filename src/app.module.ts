import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DateTimeScalar } from './common/scalars/date-time.scalar';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';
import { DoctorModule } from './doctor/doctor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      graphiql: true,
    }),
    UsersModule,
    AuthModule,
    SessionsModule,
    DoctorModule,
  ],
  controllers: [AppController],
  providers: [AppService, DateTimeScalar],
})
export class AppModule {}
