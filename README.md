# Sports Data Fetching Microservice

## Description

This project is a NestJS-based microservice designed to fetch sports data from external APIs, store it in a database using Prisma ORM, and provide it via RESTful endpoints. The service utilizes Redis for caching, Kafka for messaging, Unit-Testing for main service, and Swagger for API documentation.

### Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Endpoints](#endpoints)
- [Development](#development)

### Features

- Fetches leagues and teams data from an external sports API
- Stores fetched data in a PostgreSQL database
- Uses Redis for caching frequently accessed data
- Utilizes Kafka for message-driven architecture
- Provides interactive API documentation with Swagger
- Schedules data fetching using cron jobs
- Unit-tests for the main service

### Technologies Used

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- Docker
- Kafka
- Swagger
- TypeScript

## Prerequisites

- `Node.js` version used for this project is `20.11.1` 
- `PgAdmin 4` running or similar PostgreSQL solution(makesure to configure `.env`)
- `Redis` running(if machine is on Windows use `Ubuntu` way to set it up)
- `Docker` running(used for `Kafka`)
- `Nest` `npm install -g @nestjs/cli`
- `yarn` `npm install --global yarn`

## Installation

```bash
$ yarn install
```
- make sure to create `.env` file using `.env-example`(modified per your configuration)

```bash
$ npx prisma migrate deploy
```

```bash
$ docker-compose up -d
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Swagger documentation at http://localhost:3000/api-docs

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## License

Nest is [MIT licensed](LICENSE).
