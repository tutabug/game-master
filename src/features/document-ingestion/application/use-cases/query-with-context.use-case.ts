import { Injectable, Logger } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { VectorStoreService } from '../../domain/services/vector-store.service';
import { StoredChunkRepository } from '../../domain/repositories/stored-chunk.repository';
import {
  RAG_SYSTEM_PROMPT,
  RAG_USER_PROMPT_TEMPLATE,
  DEFAULT_RAG_CONFIG,
} from '../constants/prompts.constants';

export interface QueryWithContextOptions {
  collectionName?: string;
  topK?: number;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface QueryResult {
  answer: string;
  sources: Array<{
    chunkId: string;
    content: string;
    metadata: any;
    score: number;
  }>;
}

@Injectable()
export class QueryWithContextUseCase {
  private readonly logger = new Logger(QueryWithContextUseCase.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly chunkRepository: StoredChunkRepository,
    private readonly chatModel: ChatOllama,
  ) {}

  async execute(query: string, options: QueryWithContextOptions = {}): Promise<QueryResult> {
    const { collectionName = 'srd-markdown-chunks', topK = DEFAULT_RAG_CONFIG.topK } = options;

    this.logger.log(`Querying with RAG: "${query}"`);
    this.logger.log(`Retrieving top ${topK} chunks from ${collectionName}`);

    // Step 1: Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Step 2: Search vector store for relevant chunks
    const vectorResults = await this.vectorStoreService.searchVectors(
      collectionName,
      queryEmbedding,
      topK,
    );

    this.logger.log(`Found ${vectorResults.length} relevant chunks`);

    // Step 3: Extract chunks from vector results (content already in payload)
    const chunks = vectorResults.map((result) => ({
      chunkId: result.id,
      content: result.payload.content,
      metadata: {
        chunkIndex: result.payload.chunkIndex,
        pageNumber: result.payload.pageNumber,
        documentId: result.payload.documentId,
      },
      score: result.score,
    }));

    // Log retrieved chunks for debugging
    this.logger.log('Retrieved chunks:');
    chunks.forEach((chunk, idx) => {
      this.logger.log(
        `[${idx + 1}] Score: ${chunk.score.toFixed(4)} | Content preview: ${chunk.content.substring(0, 100)}...`,
      );
    });

    // Step 4: Build context from retrieved chunks
    const context = chunks.map((chunk, idx) => `[${idx + 1}] ${chunk.content}`).join('\n\n---\n\n');

    // Step 5: Build prompt
    const userPrompt = RAG_USER_PROMPT_TEMPLATE.replace('{context}', context).replace(
      '{question}',
      query,
    );

    this.logger.log('Sending request to LLM...');

    // Step 6: Call LLM
    const response = await this.chatModel.invoke([
      { role: 'system', content: RAG_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    return {
      answer: response.content as string,
      sources: chunks,
    };
  }

  async *executeStream(
    query: string,
    options: QueryWithContextOptions = {},
  ): AsyncGenerator<string, void, unknown> {
    const { collectionName = 'documents', topK = DEFAULT_RAG_CONFIG.topK } = options;

    this.logger.log(`Querying with RAG (streaming): "${query}"`);
    this.logger.log(`Retrieving top ${topK} chunks from ${collectionName}`);

    // Step 1-3: Same retrieval process
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const vectorResults = await this.vectorStoreService.searchVectors(
      collectionName,
      queryEmbedding,
      topK,
    );

    this.logger.log(`Found ${vectorResults.length} relevant chunks`);

    const chunks = vectorResults.map((result) => ({
      chunkId: result.id,
      content: result.payload.content,
      metadata: {
        chunkIndex: result.payload.chunkIndex,
        pageNumber: result.payload.pageNumber,
        documentId: result.payload.documentId,
      },
      score: result.score,
    }));

    // Log retrieved chunks for debugging
    this.logger.log('Retrieved chunks:');
    chunks.forEach((chunk, idx) => {
      this.logger.log(
        `[${idx + 1}] Score: ${chunk.score.toFixed(4)} | Content preview: ${chunk.content.substring(0, 100)}...`,
      );
    });

    // Step 4-5: Build context and prompt
    const context = chunks.map((chunk, idx) => `[${idx + 1}] ${chunk.content}`).join('\n\n---\n\n');

    const userPrompt = RAG_USER_PROMPT_TEMPLATE.replace('{context}', context).replace(
      '{question}',
      query,
    );

    this.logger.log('Streaming response from LLM...');
    this.logger.debug(`Using model: ${this.chatModel.model}`);
    this.logger.debug(`Base URL: ${this.chatModel.baseUrl}`);

    // Step 6: Stream LLM response
    try {
      const stream = await this.chatModel.stream([
        { role: 'system', content: RAG_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]);

      for await (const chunk of stream) {
        yield chunk.content as string;
      }
    } catch (error) {
      this.logger.error('Error streaming from LLM:', error);
      throw error;
    }
  }
}
