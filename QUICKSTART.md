# Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Install pnpm globally if you haven't
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 2. Start with Docker (Recommended)
```bash
docker-compose up
```

This will start:
- NestJS application on http://localhost:3000
- Swagger UI on http://localhost:3000/api
- MongoDB on port 27017

### 3. Test the API

**Using Swagger UI:**
Visit http://localhost:3000/api and use the interactive documentation.

**Using curl:**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Task",
    "dueDate": "2025-12-31T23:59:59.000Z"
  }'
```

**Expected Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "My First Task",
  "dueDate": "2025-12-31T23:59:59.000Z",
  "createdAt": "2025-12-07T10:00:00.000Z"
}
```

### 4. Run Tests

**Unit Tests:**
```bash
pnpm test
```

**Integration Tests:**
```bash
pnpm run test:integration
```

**With Coverage:**
```bash
pnpm run test:cov
```

### 5. Code Quality

**Lint:**
```bash
pnpm run lint
```

**Format:**
```bash
pnpm run format
```

## 📁 Project Structure

```
src/
├── domain/                    # Business entities & repository interfaces
│   ├── entities/              # Task.entity.ts
│   └── repositories/          # TaskRepository interface
├── application/               # Use cases & DTOs
│   ├── dtos/                  # CreateTaskDto, TaskResponseDto
│   └── use-cases/             # CreateTaskUseCase
├── infrastructure/            # External concerns
│   └── persistence/           # MongoDB implementation
│       ├── schemas/           # Mongoose schemas
│       └── repositories/      # Repository implementations
├── presentation/              # HTTP layer
│   └── controllers/           # TaskController
└── task/                      # Feature module
```

## 🎯 Next Steps

1. **Add more endpoints**: GET /tasks, GET /tasks/:id, DELETE /tasks/:id
2. **Add more features**: Update task, mark as complete, filtering
3. **Add authentication**: JWT, OAuth, etc.
4. **Add more entities**: Users, Projects, etc.

## 🐛 Troubleshooting

**MongoDB connection failed:**
- Ensure Docker is running
- Check that port 27017 is not in use

**Tests failing:**
- For integration tests, Docker must be running (Testcontainers needs it)
- Ensure no other services are using ports 3000 or 27017

**ESLint/TypeScript version warning:**
- This is just a warning about TypeScript version compatibility
- The code will work fine, you can safely ignore it
