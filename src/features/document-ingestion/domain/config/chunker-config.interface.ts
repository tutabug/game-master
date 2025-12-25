export interface RecursiveChunkerConfig {
  chunkSize: number;
  overlap: number;
}

export const DEFAULT_RECURSIVE_CONFIG: RecursiveChunkerConfig = {
  chunkSize: 1000,
  overlap: 200,
};

export interface TocChunkerConfig {
  maxChunkSize?: number;
  minChunkSize?: number;
  combineSmallSections?: boolean;
  headerPatterns?: RegExp[];
}

export const DEFAULT_TOC_CONFIG: TocChunkerConfig = {
  maxChunkSize: 5000,
  minChunkSize: 100,
  combineSmallSections: true,
  headerPatterns: [/^#+\s+(.+)$/m, /^([A-Z][A-Za-z\s]+)\s*$/m],
};
