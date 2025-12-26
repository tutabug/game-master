#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ChunkDocumentUseCase } from '../features/document-ingestion/application/use-cases/chunk-document.use-case';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      'Usage: pnpm chunk <filename-or-path> [--config <config.json>] [--collection <name>]',
    );
    console.error('Examples:');
    console.error('  pnpm chunk SRD_CC_v5.2.1.pdf          # Uses default documents/ folder');
    console.error('  pnpm chunk /absolute/path/to/file.pdf  # Uses absolute path');
    console.error(
      '  pnpm chunk documents/markdown/SRD.md --config config/toc-markdown-config.json',
    );
    console.error('  pnpm chunk file.pdf --collection custom-chunks');
    process.exit(1);
  }

  const input = args[0];

  // Parse CLI arguments
  const configIndex = args.indexOf('--config');
  const collectionIndex = args.indexOf('--collection');

  const configPath = configIndex !== -1 && args[configIndex + 1] ? args[configIndex + 1] : null;
  const collectionName =
    collectionIndex !== -1 && args[collectionIndex + 1] ? args[collectionIndex + 1] : null;

  let filePath: string;

  if (path.isAbsolute(input)) {
    filePath = input;
  } else if (input.includes('/') || input.includes('\\')) {
    filePath = path.resolve(input);
  } else {
    filePath = path.join(process.cwd(), 'documents', input);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`📄 Chunking document: ${filePath}`);
  console.log('⏳ Starting NestJS application...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const chunkDocumentUseCase = app.get(ChunkDocumentUseCase);

    // Load config if provided
    let options: any = {};
    if (configPath) {
      const fullConfigPath = path.isAbsolute(configPath)
        ? configPath
        : path.join(process.cwd(), configPath);
      if (!fs.existsSync(fullConfigPath)) {
        console.error(`Error: Config file not found: ${fullConfigPath}`);
        process.exit(1);
      }
      const configContent = fs.readFileSync(fullConfigPath, 'utf-8');
      options = JSON.parse(configContent);
      console.log(`📋 Using config: ${configPath}`);
    }

    // Override collection name from CLI if provided
    if (collectionName) {
      options.collectionName = collectionName;
      console.log(`🗄️  Using collection: ${collectionName}`);
    } else if (options.collectionName) {
      console.log(`🗄️  Using collection from config: ${options.collectionName}`);
    }

    console.log('🔄 Processing document...');
    const startTime = Date.now();

    const result = await chunkDocumentUseCase.execute(filePath, options);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Document chunked successfully!');
    console.log('─'.repeat(50));
    console.log(`📋 Task ID:      ${result.taskId}`);
    console.log(`📝 Document ID:  ${result.documentId}`);
    console.log(`📦 Total Chunks: ${result.totalChunks}`);
    console.log(`⏱️  Duration:     ${duration}s`);
    console.log(`✨ Status:       ${result.status}`);
    console.log('─'.repeat(50));
  } catch (error) {
    console.error('\n❌ Error chunking document:');
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
