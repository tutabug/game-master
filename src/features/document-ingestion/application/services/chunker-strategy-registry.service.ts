import { Injectable } from '@nestjs/common';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { ChunkStrategy } from '../../domain/enums/chunk-strategy.enum';

@Injectable()
export class ChunkerStrategyRegistry {
  private readonly chunkers = new Map<ChunkStrategy, TextChunkerService<any>>();

  register(chunker: TextChunkerService<any>): void {
    const strategy = chunker.getStrategy();
    this.chunkers.set(strategy, chunker);
  }

  getChunker(strategy: ChunkStrategy): TextChunkerService<any> {
    const chunker = this.chunkers.get(strategy);
    if (!chunker) {
      throw new Error(`No chunker registered for strategy: ${strategy}`);
    }
    return chunker;
  }

  hasStrategy(strategy: ChunkStrategy): boolean {
    return this.chunkers.has(strategy);
  }
}
