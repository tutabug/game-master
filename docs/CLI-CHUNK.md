# Document Chunking CLI

## Usage

The `pnpm chunk` command allows you to chunk PDF documents into smaller pieces for processing.

### Basic Usage

```bash
pnpm chunk <filename-or-path>
```

### Examples

**1. Chunk a file from the default documents/ folder:**
```bash
pnpm chunk SRD_CC_v5.2.1.pdf
```

**2. Chunk a file with an absolute path:**
```bash
pnpm chunk /Users/username/Documents/myfile.pdf
```

**3. Chunk a file with a relative path:**
```bash
pnpm chunk ../data/document.pdf
```

### Output

The command will display:
- Task ID - Unique identifier for this chunking operation
- Document ID - Auto-generated ID for the document
- Total Chunks - Number of chunks created
- Duration - Time taken to process the document
- Status - Completion status (completed/failed)

### Configuration

The chunking uses the default configuration:
- **Strategy**: recursive-1000-200
- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters

### Database

All chunks and task information are stored in MongoDB. You can query them later using the task ID or document ID.

### Error Handling

If the file is not found, the command will display an error message and exit with code 1.
