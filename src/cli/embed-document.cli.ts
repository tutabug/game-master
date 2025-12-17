#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProcessEmbeddingsUseCase } from '../features/document-ingestion/application/use-cases/process-embeddings.use-case';
import { ChunkingTaskRepository } from '../features/document-ingestion/domain/repositories/ingestion-task.repository';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: pnpm embed <chunking-task-id> [--resume]');
    console.error('');
    console.error('Description:');
    console.error('  Generate embeddings for chunks from a completed chunking task');
    console.error('  and store them in Qdrant vector database.');
    console.error('');
    console.error('Options:');
    console.error('  --resume    Resume a failed or interrupted embedding task');
    console.error('');
    console.error('Examples:');
    console.error('  pnpm embed 6941d97319a7a66b48a56546');
    console.error('  pnpm embed 6941d97319a7a66b48a56546 --resume');
    console.error('');
    console.error('Note: The chunking task must be completed before running embeddings.');
    console.error('      Use --resume to continue from where it left off if interrupted.');
    process.exit(1);
  }

  const chunkingTaskId = args[0];
  const resume = args.includes('--resume');

  console.log(`🔍 Processing embeddings for chunking task: ${chunkingTaskId}`);
  console.log('⏳ Starting NestJS application...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const processEmbeddingsUseCase = app.get(ProcessEmbeddingsUseCase);
    const chunkingTaskRepository = app.get(ChunkingTaskRepository);

    const chunkingTask = await chunkingTaskRepository.findById(chunkingTaskId);

    if (!chunkingTask) {
      console.error(`❌ Error: Chunking task not found: ${chunkingTaskId}`);
      process.exit(1);
    }

    if (!chunkingTask.isCompleted()) {
      console.error(
        `❌ Error: Chunking task is not completed. Current status: ${chunkingTask.status}`,
      );
      console.error(
        '   Please wait for the chunking task to complete before generating embeddings.',
      );
      process.exit(1);
    }

    console.log('📄 Chunking Task Details:');
    console.log(`   Document ID:  ${chunkingTask.documentId}`);
    console.log(`   Total Chunks: ${chunkingTask.totalChunks}`);
    console.log(`   Status:       ${chunkingTask.status}`);
    if (resume) {
      console.log(`   Mode:         Resume (skip already processed chunks)`);
    }
    console.log('');

    console.log('🔄 Generating embeddings...');
    const startTime = Date.now();

    const result = await processEmbeddingsUseCase.execute({
      chunkingTaskId: chunkingTask.id,
      documentId: chunkingTask.documentId,
      resume,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Embeddings generated successfully!');
    console.log('─'.repeat(50));
    console.log(`📋 Embedding Task ID:    ${result.taskId}`);
    console.log(`📝 Document ID:          ${result.documentId}`);
    console.log(`📦 Total Chunks:         ${result.totalChunks}`);
    console.log(`✓  Processed Chunks:     ${result.processedChunks}`);
    console.log(`🗄️  Collection Name:      ${result.collectionName}`);
    console.log(`⏱️  Duration:             ${duration}s`);
    console.log(`✨ Status:               ${result.status}`);
    console.log('─'.repeat(50));
  } catch (error) {
    console.error('\n❌ Error generating embeddings:');
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
