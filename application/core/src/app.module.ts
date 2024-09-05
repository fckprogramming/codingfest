import { join } from "node:path"

import {
  ApolloDriver,
  type ApolloDriverConfig,
  ValidationError,
} from "@nestjs/apollo"
import { Module, ValidationPipe } from "@nestjs/common"
import { APP_PIPE } from "@nestjs/core"
import { GraphQLModule } from "@nestjs/graphql"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule as NestPassportModule } from "@nestjs/passport"
import { TypeOrmModule } from "@nestjs/typeorm"
import { PubSub } from "graphql-subscriptions"

import { JwtStrategy } from "@/authentication/strategies/jwt.strategy"
import { Invitation } from "@/entities/invitation.entity"
import { UserLocation } from "@/entities/user-location.entity"
import { User } from "@/entities/user.entity"
import { AuthenticationResolver } from "@/resolvers/authentication.resolver"
import { InvitationsResolver } from "@/resolvers/invitations.resolver"
import { MapResolver } from "@/resolvers/map.resolver"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      autoLoadEntities: true,
      database: "test",
      host: "localhost",
      password: "test",
      port: 5432,
      synchronize: true,
      type: "postgres",
      username: "test",
    }),
    TypeOrmModule.forFeature([User, UserLocation, Invitation]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: join(process.cwd(), "src/__generated__/schema.graphql"),
      driver: ApolloDriver,
      formatError(error) {
        if (error.extensions?.code === "GRAPHQL_VALIDATION_FAILED") {
          return {
            ...error,
            validationErrors: error.extensions?.errors,
          }
        }
        return error
      },
      subscriptions: {
        "graphql-ws": true,
      },
    }),
    NestPassportModule,
    JwtModule.register({
      secret: "secret",
    }),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        exceptionFactory(errors) {
          return new ValidationError("Invalid data", {
            extensions: {
              errors: Object.fromEntries(
                errors.map((error) => [
                  error.property,
                  Object.values(error.constraints),
                ])
              ),
            },
          })
        },
        forbidUnknownValues: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        whitelist: true,
      }),
    },
    {
      provide: PubSub,
      useValue: new PubSub(),
    },
    AuthenticationResolver,
    JwtStrategy,
    MapResolver,
    InvitationsResolver,
  ],
})
export class AppModule {}
