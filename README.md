# Task Management API - NestJS Boilerplate

A production-ready NestJS boilerplate project implementing clean architecture principles with MongoDB, Docker, comprehensive testing, and API documentation.

## Features

- 🏗️ **Clean Architecture** - Domain-driven design with clear separation of concerns
- 🐳 **Docker & Docker Compose** - Fully containerized application
- 📝 **MongoDB Integration** - Mongoose ODM for data persistence
- ✅ **Validation** - Request DTOs validated with class-validator
- 📚 **Swagger Documentation** - Interactive API documentation at `/api`
- 🧪 **Unit Tests** - Jest-based unit tests alongside source files
- 🔬 **Integration Tests** - Supertest + Testcontainers for isolated E2E testing
- 🎨 **Code Quality** - ESLint and Prettier configured with best practices

## Project Structure

```
src/
├── domain/                    # Domain layer (entities, repository interfaces)
│   ├── entities/              # Core business entities
│   └── repositories/          # Repository interface definitions
├── application/               # Application layer (use cases, DTOs)
│   ├── dtos/                  # Data Transfer Objects
│   └── use-cases/             # Business logic orchestration
├── infrastructure/            # Infrastructure layer (external concerns)
│   └── persistence/           # Database implementation (Mongoose)
│       ├── schemas/           # MongoDB schemas
│       └── repositories/      # Repository implementations
├── presentation/              # Presentation layer (controllers)
│   └── controllers/           # HTTP controllers
└── task/                      # Feature module
```

## Architecture Principles

### Clean Architecture Layers

1. **Domain Layer** - Pure business logic, no dependencies on external libraries
2. **Application Layer** - Use cases and DTOs, depends only on domain
3. **Infrastructure Layer** - External concerns (database, APIs), implements domain interfaces
4. **Presentation Layer** - HTTP controllers, maps requests to use cases

### Dependency Flow

Dependencies point inward: `Presentation → Application → Domain ← Infrastructure`

The domain layer has no dependencies on outer layers, ensuring business logic remains portable and testable.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm (install with `npm install -g pnpm`)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bondio-interview
```

2. Install pnpm (if not already installed):
```bash
npm install -g pnpm
```

3. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

### Running with Docker Compose

Start the application and MongoDB:

```bash
docker-compose up
```

The API will be available at:
- Application: http://localhost:3000
- Swagger UI: http://localhost:3000/api
- MongoDB: localhost:27017

### Running Locally (without Docker)

1. Ensure MongoDB is running locally on port 27017

2. Start the application in development mode:
```bash
pnpm run start:dev
```

## Testing

### Unit Tests

Run unit tests (files with `.spec.ts` suffix):

```bash
pnpm test
```

Watch mode:
```bash
pnpm run test:watch
```

With coverage:
```bash
pnpm run test:cov
```

### Integration Tests

Run integration tests (files with `.integration.spec.ts` suffix):

```bash
pnpm run test:integration
```

Integration tests use:
- **Testcontainers** - Spins up real MongoDB containers
- **Supertest** - Makes HTTP requests to the API
- **Isolated databases** - Each test runs with a clean database

## API Endpoints

### POST /tasks

Create a new task.

**Request Body:**
```json
{
  "title": "Complete project documentation",
  "dueDate": "2025-12-31T23:59:59.000Z"
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Complete project documentation",
  "dueDate": "2025-12-31T23:59:59.000Z",
  "createdAt": "2025-12-07T10:00:00.000Z"
}
```

## Code Quality

### Linting

```bash
pnpm run lint
```

### Formatting

```bash
pnpm run format
```

## Development Workflow

1. **Domain First** - Define entities and repository interfaces in `domain/`
2. **Use Cases** - Implement business logic in `application/use-cases/`
3. **Infrastructure** - Implement repository interfaces in `infrastructure/`
4. **Controllers** - Add HTTP endpoints in `presentation/controllers/`
5. **Tests** - Write unit tests (`.spec.ts`) and integration tests (`.integration.spec.ts`)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/taskdb` |
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |

## Scripts

- `pnpm run build` - Build the application
- `pnpm run start` - Start the application
- `pnpm run start:dev` - Start in watch mode
- `pnpm run start:prod` - Start production build
- `pnpm test` - Run unit tests
- `pnpm run test:integration` - Run integration tests
- `pnpm run lint` - Lint the code
- `pnpm run format` - Format the code

## License

MIT
