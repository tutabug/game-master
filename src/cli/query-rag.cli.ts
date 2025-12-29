#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { QueryWithContextUseCase } from '../features/document-ingestion/application/use-cases/query-with-context.use-case';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: pnpm query-rag --query "your question" [options]');
    console.log('');
    console.log('Options:');
    console.log('  --query, -q       Query text (required)');
    console.log('  --limit, -l       Number of chunks to retrieve (default: 20)');
    console.log('  --collection, -c  Collection name (default: srd-markdown-chunks)');
    console.log('  --no-stream       Disable streaming (get complete response at once)');
    console.log('  --help, -h        Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm query-rag --query "What are the rules for advantage?"');
    console.log('  pnpm query-rag -q "How does spell casting work?" -l 10');
    console.log('  pnpm query-rag -q "Explain stealth checks" --no-stream');
    process.exit(0);
  }

  let query = '';
  let limit = 20;
  let collectionName = 'srd-markdown-chunks';
  let stream = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--query' || arg === '-q') && args[i + 1]) {
      query = args[i + 1];
      i++;
    } else if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if ((arg === '--collection' || arg === '-c') && args[i + 1]) {
      collectionName = args[i + 1];
      i++;
    } else if (arg === '--no-stream') {
      stream = false;
    }
  }

  if (!query) {
    console.error('Error: --query is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  console.log('🤖 D&D RAG Query System');
  console.log('─'.repeat(50));
  console.log(`❓ Query: ${query}`);
  console.log(`📦 Retrieving top ${limit} chunks from ${collectionName}`);
  console.log(`🔄 Streaming: ${stream ? 'enabled' : 'disabled'}`);
  console.log('─'.repeat(50));
  console.log('⏳ Starting...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const queryUseCase = app.get(QueryWithContextUseCase);

    if (stream) {
      console.log('💬 Response:\n');
      const streamGenerator = queryUseCase.executeStream(query, {
        collectionName,
        topK: limit,
      });

      for await (const chunk of streamGenerator) {
        process.stdout.write(chunk);
      }
      console.log('\n');
    } else {
      const result = await queryUseCase.execute(query, {
        collectionName,
        topK: limit,
      });

      console.log('💬 Response:\n');
      console.log(result.answer);
      console.log('\n');
      console.log('─'.repeat(50));
      console.log(`📚 Sources: ${result.sources.length} chunks retrieved`);
      console.log('─'.repeat(50));

      result.sources.slice(0, 3).forEach((source, idx) => {
        console.log(`\n[${idx + 1}] Score: ${source.score.toFixed(4)}`);
        console.log(`Content: ${source.content.substring(0, 150)}...`);
      });
    }

    console.log('\n✅ Complete!');
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error instanceof Error ? error.message : error);
    console.error(error instanceof Error ? error.stack : '');
    process.exit(1);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
