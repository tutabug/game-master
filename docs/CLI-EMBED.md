# Document Embedding CLI

## Usage

The `pnpm embed` command generates embeddings for document chunks and stores them in Qdrant vector database.

### Basic Usage

```bash
pnpm embed <chunking-task-id>
```

### Prerequisites

1. **Chunking task must be completed** - Run `pnpm chunk <filename>` first
2. **Ollama must be running** - Ensure Ollama service is available (default: http://localhost:11434)
3. **Qdrant must be running** - Ensure Qdrant vector database is available (default: http://localhost:6333)
4. **MongoDB must be running** - Connection string in .env

### Example Workflow

**Step 1: Chunk a document**
```bash
pnpm chunk SRD_CC_v5.2.1.pdf
```

Output:
```
✅ Document chunked successfully!
──────────────────────────────────────────────────
📋 Task ID:      6941d97319a7a66b48a56546
📝 Document ID:  SRD_CC_v5.2.1-591cd430
📦 Total Chunks: 1829
⏱️  Duration:     3.34s
✨ Status:       completed
──────────────────────────────────────────────────
```

**Step 2: Generate embeddings using the Task ID**
```bash
pnpm embed 6941d97319a7a66b48a56546
```

Output:
```
✅ Embeddings generated successfully!
──────────────────────────────────────────────────
📋 Embedding Task ID:    694c8f3a1b2d8e9f0a1b2c3d
📝 Document ID:          SRD_CC_v5.2.1-591cd430
📦 Total Chunks:         1829
✓  Processed Chunks:     1829
🗄️  Collection Name:      documents
⏱️  Duration:             45.2s
✨ Status:               completed
──────────────────────────────────────────────────
```

### Configuration

Embeddings use the following default configuration:

- **Model**: nomic-embed-text (via Ollama)
- **Dimension**: 768
- **Collection**: documents
- **Distance**: Cosine similarity

Configuration is defined in `src/features/document-ingestion/application/constants/embedding.constants.ts`

### Vector Payload

Each vector stored in Qdrant includes rich metadata:

- `chunkId` - MongoDB chunk ID
- `chunkIndex` - Position in document
- `content` - The actual text chunk
- `documentId` - Document identifier
- `chunkingTaskId` - Reference to chunking task
- `embeddingTaskId` - Reference to embedding task
- `pageNumber` - PDF page number (if available)
- `contentType` - Content MIME type (e.g., 'application/pdf')
- `tags` - Array of categorization tags
- `createdAt` - ISO timestamp
- `version` - Version identifier

### Error Handling

**Chunking task not found:**
```bash
❌ Error: Chunking task not found: invalid-task-id
```

**Chunking task not completed:**
```bash
❌ Error: Chunking task is not completed. Current status: processing
   Please wait for the chunking task to complete before generating embeddings.
```

**Ollama not available:**
```bash
❌ Error generating embeddings:
Failed to connect to Ollama at http://localhost:11434
```

**Qdrant not available:**
```bash
❌ Error generating embeddings:
Failed to connect to Qdrant at http://localhost:6333
```

### Docker Setup

To run the required services via Docker Compose:

```bash
docker-compose up -d mongodb qdrant ollama
```

This starts:
- MongoDB on port 27017
- Qdrant on port 6333
- Ollama on port 11434

### Environment Variables

Configure in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/document-ingestion
QDRANT_URL=http://localhost:6333
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text
```

### Querying Vectors

After embedding, you can query the vectors in Qdrant:

```bash
# Using Qdrant REST API
curl -X POST http://localhost:6333/collections/documents/points/scroll \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "with_payload": true,
    "with_vector": false
  }'
```

Or use the Qdrant web UI at http://localhost:6333/dashboard
