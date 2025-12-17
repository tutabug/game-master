# Embedding Batch Processing & Resumability

## Overview

The embedding generation process supports **batch processing**, **idempotency**, and **resumability** to handle large documents efficiently and recover from interruptions.

## Key Features

### 1. Batch Processing
- **Memory Efficient**: Loads chunks in batches (default: 50 chunks per batch)
- **No Memory Overflow**: Never loads all chunks into memory at once
- **Configurable**: Adjust batch size via `EMBEDDING_BATCH_SIZE` constant

### 2. Idempotency
- **Skip Already Processed**: Checks if vector already exists before processing
- **Deterministic IDs**: Uses chunk ID as vector ID for idempotent operations
- **Safe Retries**: Can safely re-run without duplicating vectors

### 3. Resumability
- **Continue from Interruption**: Resume from where the process stopped
- **Track Progress**: Embedding task tracks `processedChunks` count
- **Recover from Failures**: Retry failed tasks with `--resume` flag

## How It Works

### Architecture

```
ProcessEmbeddingsUseCase
├── Find or Create Embedding Task
├── Load Chunks in Batches (50 at a time)
│   ├── Check if Vector Exists (idempotency)
│   ├── Generate Embedding (if not exists)
│   ├── Store Vector with Chunk ID
│   └── Increment Progress Counter
└── Mark Task as Completed
```

### Batch Processing Flow

```typescript
// Load chunks in batches to avoid memory issues
while (offset < totalChunks) {
  const batchChunks = await repository.findByTaskIdPaginated(
    taskId, 
    offset, 
    BATCH_SIZE
  );
  
  for (const chunk of batchChunks) {
    // Check if already processed (idempotency)
    if (await vectorStore.vectorExists(collection, chunk.id)) {
      skip();
      continue;
    }
    
    // Process chunk
    const embedding = await generateEmbedding(chunk.content);
    await storeVector(chunk.id, embedding, payload);
    await incrementProgress();
  }
  
  offset += BATCH_SIZE;
}
```

### Idempotency Mechanism

**Vector ID = Chunk ID**
- Each vector uses the chunk's MongoDB ObjectId as its vector ID
- Qdrant checks if vector exists before processing
- Skip already-processed chunks automatically

```typescript
// Idempotent vector storage
const vectorId = chunk.id; // Use chunk ID as vector ID

if (await vectorStore.vectorExists(collection, vectorId)) {
  logger.log(`Skipping chunk ${chunk.chunkIndex} (already processed)`);
  continue;
}

await vectorStore.storeVectors(collection, [{
  id: vectorId,  // Deterministic ID
  vector: embedding,
  payload: { ...metadata }
}]);
```

### Resumability States

| State | Description | Action |
|-------|-------------|--------|
| **No Task** | First run | Create new task, start processing |
| **Pending** | Task created but not started | Resume processing |
| **Processing** | Task in progress, interrupted | Resume from last checkpoint |
| **Failed** | Task failed with error | Resume and retry failed chunks |
| **Completed** | All chunks processed | Return existing results |

## Usage

### CLI Commands

#### Start New Embedding Task

```bash
pnpm embed <chunking-task-id>
```

Example:
```bash
pnpm embed 6941d97319a7a66b48a56546
```

#### Resume Interrupted Task

```bash
pnpm embed <chunking-task-id> --resume
```

Example:
```bash
# Process was interrupted at chunk 523/1829
pnpm embed 6941d97319a7a66b48a56546 --resume

# Output:
# Skipping chunk 0-522 (already processed)
# Processing batch: chunks 523-572 of 1829
# [523/1829] Generating embedding for chunk 523
# ...
```

### Programmatic Usage

```typescript
import { ProcessEmbeddingsUseCase } from './process-embeddings.use-case';

// First run
const result = await processEmbeddingsUseCase.execute({
  chunkingTaskId: 'abc-123',
  documentId: 'doc-xyz',
});

// Resume interrupted task
const result = await processEmbeddingsUseCase.execute({
  chunkingTaskId: 'abc-123',
  documentId: 'doc-xyz',
  resume: true,  // Enable resumability
});
```

## Configuration

### Batch Size

Adjust the batch size in `embedding.constants.ts`:

```typescript
export const EMBEDDING_BATCH_SIZE = 50;  // Default: 50 chunks per batch
```

**Recommendations:**
- **Small documents** (<100 chunks): 25-50
- **Medium documents** (100-1000 chunks): 50-100
- **Large documents** (>1000 chunks): 100-200

**Trade-offs:**
- Smaller batches: More database queries, less memory
- Larger batches: Fewer queries, more memory usage

### Memory Considerations

**Batch Processing Benefits:**
```
Without Batching:
├── Load 10,000 chunks into memory (500MB)
├── Process all at once
└── Risk: Out of Memory

With Batching (50 chunks):
├── Load 50 chunks (2.5MB)
├── Process batch
├── Load next 50 chunks
└── Memory: Always <5MB
```

## Error Handling

### Automatic Recovery

The system handles failures gracefully:

```typescript
try {
  await processEmbeddings();
} catch (error) {
  // Mark task as FAILED
  await updateStatus(taskId, EmbeddingTaskStatus.FAILED, error.message);
  
  // Progress is preserved (processedChunks = 523)
  // Resume later with --resume flag
}
```

### Manual Recovery

If the process fails:

1. **Check task status** in MongoDB:
   ```javascript
   db.embedding_tasks.findOne({ chunkingTaskId: "abc-123" })
   // { status: "failed", processedChunks: 523, totalChunks: 1829 }
   ```

2. **Resume processing**:
   ```bash
   pnpm embed abc-123 --resume
   ```

3. **Verify completion**:
   ```bash
   # Check Qdrant collection
   curl http://localhost:6333/collections/documents/points/count
   ```

## Monitoring Progress

### Real-time Logs

```
Processing 1829 chunks in batches of 50
Processing batch: chunks 1-50 of 1829
[1/1829] Generating embedding for chunk 0
[1/1829] Storing vector for chunk 0
[2/1829] Generating embedding for chunk 1
...
Progress: 10/1829 chunks processed (1%)
Progress: 20/1829 chunks processed (1%)
...
Progress: 50/1829 chunks processed (3%)
Processing batch: chunks 51-100 of 1829
...
Completed embedding generation for all 1829 chunks
```

### Task Status

Query embedding task status:

```javascript
db.embedding_tasks.findOne({ _id: ObjectId("...") })

{
  _id: ObjectId("..."),
  chunkingTaskId: "6941d97319a7a66b48a56546",
  documentId: "SRD_CC_v5.2.1-591cd430",
  status: "processing",
  totalChunks: 1829,
  processedChunks: 523,
  embeddingConfig: {
    model: "nomic-embed-text",
    dimension: 768,
    collectionName: "documents"
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

## Performance Metrics

### Benchmark Results

**Document**: D&D SRD (1829 chunks, ~1.8MB text)

| Metric | Value |
|--------|-------|
| **Batch Size** | 50 chunks |
| **Processing Rate** | ~3 chunks/second |
| **Total Time** | ~10 minutes |
| **Memory Usage** | <50MB peak |
| **Network I/O** | Minimal (batched) |

### Optimization Tips

1. **Increase Batch Size**: For powerful machines
   ```typescript
   export const EMBEDDING_BATCH_SIZE = 100;
   ```

2. **Parallel Embedding Generation**: Process multiple embeddings concurrently
   ```typescript
   const embeddings = await Promise.all(
     batch.map(chunk => embeddingService.generateEmbedding(chunk.content))
   );
   ```

3. **Batch Vector Storage**: Store entire batch at once
   ```typescript
   await vectorStore.storeVectors(collection, allBatchVectors);
   ```

## Database Schema

### Embedding Task

```typescript
{
  _id: ObjectId,
  chunkingTaskId: string,        // Reference to chunking task
  documentId: string,             // Document identifier
  status: "pending" | "processing" | "completed" | "failed",
  totalChunks: number,            // Total chunks to process
  processedChunks: number,        // Chunks completed so far
  embeddingConfig: {
    model: string,
    dimension: number,
    collectionName: string
  },
  errorMessage?: string,
  createdAt: Date,
  updatedAt: Date,
  completedAt?: Date
}
```

### Indexes

```javascript
db.embedding_tasks.createIndex({ chunkingTaskId: 1 }, { unique: true })
db.embedding_tasks.createIndex({ documentId: 1 })
db.embedding_tasks.createIndex({ status: 1, createdAt: -1 })
```

## Troubleshooting

### Issue: Task stuck in PROCESSING

**Cause**: Process was killed without updating status

**Solution**:
```bash
# Resume the task
pnpm embed <chunking-task-id> --resume
```

### Issue: Duplicate vectors

**Cause**: Vector ID collision (shouldn't happen with chunk ID)

**Solution**:
```bash
# Vectors are upserted by chunk ID - duplicates are replaced
# Idempotency ensures consistency
```

### Issue: Memory issues with large documents

**Cause**: Batch size too large

**Solution**:
```typescript
// Reduce batch size
export const EMBEDDING_BATCH_SIZE = 25;
```

### Issue: Slow processing

**Cause**: Ollama embedding generation is CPU-bound

**Solution**:
- Use GPU-accelerated Ollama
- Increase batch size to reduce database overhead
- Process embeddings in parallel (advanced)

## Best Practices

1. **Always Use Resume for Large Documents**
   - Documents with >500 chunks
   - Long-running processes (>5 minutes)

2. **Monitor Progress**
   - Watch logs for batch completion
   - Check `processedChunks` field periodically

3. **Handle Interruptions Gracefully**
   - Use `--resume` flag to continue
   - Don't restart from scratch

4. **Verify Completion**
   - Check Qdrant collection count matches total chunks
   - Verify embedding task status is "completed"

5. **Tune Batch Size for Your Hardware**
   - Start with default (50)
   - Increase if memory allows
   - Decrease if OOM errors occur

## Related Documentation

- [CLI Embedding Guide](CLI-EMBED.md)
- [Docker Setup](DOCKER-SETUP.md)
- [Vector Store Configuration](VECTOR-STORE.md)
