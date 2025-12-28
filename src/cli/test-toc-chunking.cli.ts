#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ChunkDocumentUseCase } from '../features/document-ingestion/application/use-cases/chunk-document.use-case';
import { DEFAULT_MARKDOWN_CONFIG } from '../features/document-ingestion/domain/config/chunker-config.interface';

async function main() {
  console.log('📚 Testing Markdown Chunking with Markdown Document');
  console.log('─'.repeat(50));

  const filePath = 'documents/markdown/SRD_CC_v5.2.1.md';

  console.log(`📄 Document: ${filePath}`);
  console.log('⏳ Starting NestJS application...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const chunkDocumentUseCase = app.get(ChunkDocumentUseCase);

    console.log('🔄 Processing document with Markdown chunking strategy...');
    const startTime = Date.now();

    const result = await chunkDocumentUseCase.execute(filePath, {
      documentId: 'srd-markdown-test',
      chunkStrategy: 'markdown',
      markdownConfig: {
        ...DEFAULT_MARKDOWN_CONFIG,
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Document chunked successfully with Markdown strategy!');
    console.log('─'.repeat(50));
    console.log(`📋 Task ID:      ${result.taskId}`);
    console.log(`📝 Document ID:  ${result.documentId}`);
    console.log(`📦 Total Chunks: ${result.totalChunks}`);
    console.log(`⏱️  Duration:     ${duration}s`);
    console.log(`✨ Status:       ${result.status}`);
    console.log('─'.repeat(50));

    console.log('\n💡 To view the chunks, check the MongoDB stored_chunks collection');
    console.log('   or run: pnpm search "your search query"');
  } catch (error) {
    console.error('\n❌ Error chunking document:');
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
