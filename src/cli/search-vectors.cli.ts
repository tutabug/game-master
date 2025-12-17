#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmbeddingService } from '../features/document-ingestion/domain/services/embedding.service';
import { VectorStoreService } from '../features/document-ingestion/domain/services/vector-store.service';

interface SearchOptions {
  limit: number;
  collectionName: string;
  documentId?: string;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.error('Usage: pnpm search "<query text>" [options]');
    console.error('');
    console.error('Description:');
    console.error('  Search for semantically similar chunks using natural language query.');
    console.error('');
    console.error('Options:');
    console.error('  --limit <n>          Number of results to return (default: 5)');
    console.error('  --collection <name>  Collection name (default: documents)');
    console.error('  --document <id>      Filter by specific document ID (optional)');
    console.error('');
    console.error('Examples:');
    console.error('  pnpm search "What are the combat rules?"');
    console.error('  pnpm search "character creation" --limit 10');
    console.error('  pnpm search "spells" --document SRD_CC_v5.2.1-591cd430');
    process.exit(1);
  }

  const queryText = args[0];
  const options: SearchOptions = {
    limit: 5,
    collectionName: 'documents',
  };

  // Parse optional arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--collection' && args[i + 1]) {
      options.collectionName = args[i + 1];
      i++;
    } else if (args[i] === '--document' && args[i + 1]) {
      options.documentId = args[i + 1];
      i++;
    }
  }

  console.log(`\n🔍 Searching for: "${queryText}"`);
  console.log(`📊 Collection: ${options.collectionName}`);
  console.log(`📈 Limit: ${options.limit}`);
  if (options.documentId) {
    console.log(`📄 Document: ${options.documentId}`);
  }
  console.log('⏳ Starting search...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const embeddingService = app.get(EmbeddingService);
    const vectorStoreService = app.get(VectorStoreService);

    // Generate embedding from query text
    console.log('🤖 Generating embedding from query...');
    const queryEmbedding = await embeddingService.generateEmbedding(queryText);

    // Search for similar vectors
    console.log('🔎 Searching vector database...\n');
    const results = await vectorStoreService.searchVectors(
      options.collectionName,
      queryEmbedding,
      options.limit,
      options.documentId,
    );

    if (results.length === 0) {
      console.log('❌ No results found.');
      process.exit(0);
    }

    console.log(`✅ Found ${results.length} results:\n`);
    console.log('='.repeat(80));

    results.forEach((result, index) => {
      console.log(`\n📍 Result ${index + 1} (Score: ${result.score.toFixed(4)})`);
      console.log('─'.repeat(80));
      console.log(`Chunk Index: ${result.payload.chunkIndex}`);
      console.log(`Document ID: ${result.payload.documentId}`);
      if (result.payload.pageNumber) {
        console.log(`Page Number: ${result.payload.pageNumber}`);
      }
      console.log(
        `\nContent:\n${result.payload.content.substring(0, 500)}${result.payload.content.length > 500 ? '...' : ''}`,
      );
      console.log('─'.repeat(80));
    });

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ Error during search:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
