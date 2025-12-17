# Docker Setup Guide

## Quick Start

Run the setup script to start all services:

```bash
./scripts/setup-docker.sh
```

This will:
1. Start MongoDB, Qdrant, Ollama, and the NestJS app
2. Pull the `nomic-embed-text` model into Ollama
3. Display service URLs

## Manual Setup

### Start Services

```bash
docker-compose up -d
```

### Pull Ollama Model

```bash
docker exec ollama ollama pull nomic-embed-text
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

## Services

### MongoDB
- **Port**: 27017
- **Connection**: `mongodb://localhost:27017/taskdb`
- **Data**: Persisted in `mongodb_data` volume

### Qdrant Vector Database
- **HTTP Port**: 6333
- **gRPC Port**: 6334
- **Dashboard**: http://localhost:6333/dashboard
- **Data**: Persisted in `qdrant_data` volume

### Ollama
- **Port**: 11434
- **Model**: nomic-embed-text (768 dimensions)
- **Data**: Persisted in `ollama_data` volume

### NestJS Application
- **Port**: 3000
- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api

## Environment Variables

The docker-compose.yml automatically configures:

```env
MONGODB_URI=mongodb://mongodb:27017/taskdb
QDRANT_URL=http://qdrant:6333
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=nomic-embed-text
```

## Volumes

Data is persisted across container restarts:

- `mongodb_data` - MongoDB database files
- `qdrant_data` - Qdrant vector database
- `ollama_data` - Ollama models

## Troubleshooting

### Ollama Model Not Found

Pull the model manually:
```bash
docker exec ollama ollama pull nomic-embed-text
```

### Check Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ollama
docker-compose logs -f qdrant
docker-compose logs -f mongodb
```

### Reset Everything

Stop containers and remove all data:
```bash
docker-compose down -v
./scripts/setup-docker.sh
```

## Development Workflow

1. **Start services**: `./scripts/setup-docker.sh`
2. **Add documents**: Place PDFs in `./documents/`
3. **Chunk document**: `pnpm chunk filename.pdf`
4. **Generate embeddings**: `pnpm embed <task-id>`
5. **Query vectors**: Access Qdrant dashboard at http://localhost:6333/dashboard

## Production

For production, create a separate `docker-compose.prod.yml`:

```yaml
services:
  app:
    build:
      context: .
      target: production
    environment:
      - NODE_ENV=production
    command: node dist/main
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```
