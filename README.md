# Document Ingestion & RAG Pipeline

A production-ready NestJS application for document ingestion, chunking, embedding generation, and vector storage. Built with clean architecture principles and designed for RAG (Retrieval Augmented Generation) applications.

## Features

- 📄 **Document Processing** - PDF loading and intelligent text chunking
- 🧩 **Smart Chunking** - RecursiveCharacterTextSplitter with configurable overlap
- 🤖 **Embedding Generation** - Ollama integration with nomic-embed-text (768d)
- 🔍 **Vector Storage** - Qdrant vector database for semantic search
- 🏗️ **Clean Architecture** - Vertical slices with domain-driven design
- 🐳 **Docker Compose** - MongoDB, Qdrant, Ollama all containerized
- 🛠️ **CLI Commands** - `pnpm chunk` and `pnpm embed` for document processing
- 🧪 **Integration Tests** - Real containers with Testcontainers
- ✅ **Task Tracking** - Status monitoring for long-running operations
- 📝 **Rich Metadata** - Vector payloads with tags, timestamps, and document context

## Quick Start

### 1. Start Services

```bash
./scripts/setup-docker.sh
```

This starts MongoDB, Qdrant, Ollama, and pulls the embedding model.

### 2. Process a Document

```bash
# Chunk a PDF
pnpm chunk SRD_CC_v5.2.1.pdf

# Generate embeddings from the chunking task
pnpm embed <task-id-from-previous-step>
```

### 3. View Results

- **Qdrant Dashboard**: http://localhost:6333/dashboard
- **API Documentation**: http://localhost:3000/api

## Project Structure

```
src/
├── features/
│   └── document-ingestion/
│       ├── domain/
│       │   ├── entities/           # ChunkingTask, EmbeddingTask
│       │   ├── repositories/       # Abstract repository interfaces
│       │   └── services/           # VectorStoreService interface
│       ├── application/
│       │   ├── use-cases/          # ChunkDocument, ProcessEmbeddings
│       │   ├── dtos/               # Input/output data transfer objects
│       │   └── constants/          # Default configurations
│       ├── infrastructure/
│       │   ├── schemas/            # Mongoose schemas
│       │   ├── repositories/       # MongoDB implementations
│       │   └── services/           # Qdrant, Ollama integrations
│       ├── presentation/
│       │   └── controllers/        # HTTP endpoints (if needed)
│       └── document-ingestion.module.ts
├── cli/                            # CLI commands
│   ├── chunk-document.cli.ts
│   └── embed-document.cli.ts
└── shared/                         # Cross-cutting concerns
    ├── config/                     # Environment validation
    └── infrastructure/             # Database connection
```

## Architecture

### Vertical Slice Architecture

Each feature is self-contained with its own Clean Architecture layers:

- **Domain** - Entities (ChunkingTask, EmbeddingTask) and repository interfaces
- **Application** - Use cases (ChunkDocument, ProcessEmbeddings) and DTOs
- **Infrastructure** - MongoDB persistence, Qdrant vector store, Ollama embeddings
- **Presentation** - CLI commands and HTTP controllers

### Two-Phase Pipeline

1. **Phase 1: Chunking**
   - Load PDF document
   - Split into overlapping chunks (1000 chars, 200 overlap)
   - Store chunks in MongoDB with metadata
   - Track progress with ChunkingTask

2. **Phase 2: Embedding**
   - Generate 768-dimensional vectors via Ollama
   - Store vectors in Qdrant with enriched metadata
   - Track progress with EmbeddingTask
   - Enable semantic search capabilities

### Dependency Flow

`Presentation → Application → Domain ← Infrastructure`

Domain layer has zero external dependencies, ensuring business logic portability.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm (install with `npm install -g pnpm`)

## Installation

```bash
# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start all services (MongoDB, Qdrant, Ollama, App)
./scripts/setup-docker.sh
```

## CLI Commands

### Chunk Documents

Process PDF documents into overlapping text chunks:

```bash
# Chunk a file from documents/ directory
pnpm chunk filename.pdf

# Chunk with absolute path
pnpm chunk /path/to/document.pdf

# View help
pnpm chunk --help
```

**Output:**
- Task ID for tracking
- Document ID for reference
- Total chunks created
- Processing duration

See [CLI-CHUNK.md](docs/CLI-CHUNK.md) for details.

### Generate Embeddings

Create vector embeddings from chunked documents:

```bash
# Generate embeddings from chunking task
pnpm embed <chunking-task-id>

# View help
pnpm embed --help
```

**Output:**
- Embedding task ID
- Document ID
- Vectors processed
- Collection name
- Processing duration

See [CLI-EMBED.md](docs/CLI-EMBED.md) for details.

## Services

| Service | Port | Dashboard | Purpose |
|---------|------|-----------|---------|
| **MongoDB** | 27017 | - | Task and chunk persistence |
| **Qdrant** | 6333 (HTTP), 6334 (gRPC) | http://localhost:6333/dashboard | Vector storage and search |
| **Ollama** | 11434 | - | Embedding generation (nomic-embed-text) |
| **NestJS App** | 3000 | http://localhost:3000/api | API and CLI entry point |

See [DOCKER-SETUP.md](docs/DOCKER-SETUP.md) for configuration details.

## Example Workflow

```bash
# 1. Start services
./scripts/setup-docker.sh

# 2. Chunk a document
pnpm chunk SRD_CC_v5.2.1.pdf
# Output: Task ID: abc-123, Document ID: doc-xyz, Chunks: 1247

# 3. Generate embeddings
pnpm embed abc-123
# Output: Embedding Task: emb-456, Processed: 1247/1247, Collection: documents

# 4. View vectors in Qdrant
open http://localhost:6333/dashboard
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:cov
```

### Integration Tests

```bash
# Run with real containers (MongoDB, Qdrant, Ollama)
pnpm run test:integration
```

Integration tests automatically:
- Start MongoDB, Qdrant, and Ollama containers
- Pull the nomic-embed-text model (first run only)
- Process 10 test chunks end-to-end
- Validate vector storage and metadata
- Clean up all resources

**Note**: First run takes ~2 minutes to download Ollama model.

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | NestJS 10.3 | Application framework with DI |
| **Database** | MongoDB 8 + Mongoose | Task and chunk persistence |
| **Vector DB** | Qdrant 1.7.4 | Semantic search and vector storage |
| **Embeddings** | Ollama + nomic-embed-text | 768-dimensional text embeddings |
| **PDF Processing** | pdf-parse | PDF text extraction |
| **Text Splitting** | LangChain | RecursiveCharacterTextSplitter |
| **Testing** | Jest + Testcontainers | Unit and integration tests |
| **Container** | Docker + Docker Compose | Service orchestration |

## Vector Payload Structure

Each vector in Qdrant includes rich metadata:

```typescript
{
  chunkId: string;           // Unique chunk identifier
  chunkIndex: number;        // Position in document
  content: string;           // Original text content
  documentId: string;        // Source document ID
  chunkingTaskId: string;    // Phase 1 task reference
  embeddingTaskId: string;   // Phase 2 task reference
  pageNumber?: number;       // PDF page number
  contentType: string;       // MIME type (e.g., 'application/pdf')
  tags: string[];           // Custom tags for filtering
  createdAt: string;        // ISO timestamp
  version: string;          // Schema version
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/taskdb` |
| `QDRANT_URL` | Qdrant HTTP endpoint | `http://qdrant:6333` |
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://ollama:11434` |
| `OLLAMA_MODEL` | Embedding model name | `nomic-embed-text` |
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

## Development Scripts

```bash
# Build
pnpm run build

# Development
pnpm run start:dev         # Hot reload
pnpm run start:debug       # Debug mode

# Production
pnpm run start:prod

# Testing
pnpm test                  # Unit tests
pnpm run test:watch       # Watch mode
pnpm run test:cov         # Coverage
pnpm run test:integration # Integration tests

# Quality
pnpm run lint             # ESLint
pnpm run format           # Prettier

# CLI
pnpm chunk <file>         # Chunk document
pnpm embed <task-id>      # Generate embeddings
```

## Documentation

- [CLI Chunking Guide](docs/CLI-CHUNK.md)
- [CLI Embedding Guide](docs/CLI-EMBED.md)
- [Docker Setup](docs/DOCKER-SETUP.md)

## Roadmap

- [ ] **Phase 3**: RAG Query Implementation
  - Semantic search endpoint
  - LLM integration for answer generation
  - Context-aware responses

- [ ] **Content Filtering**: TOC noise removal
- [ ] **API Endpoints**: Task status and vector queries
- [ ] **Error Recovery**: Retry and resumption logic
- [ ] **Monitoring**: Metrics and progress tracking

## License

MIT
