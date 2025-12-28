export interface RecursiveChunkerConfig {
  chunkSize: number;
  overlap: number;
}

export const DEFAULT_RECURSIVE_CONFIG: RecursiveChunkerConfig = {
  chunkSize: 1000,
  overlap: 200,
};

export interface MarkdownChunkerConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export const DEFAULT_MARKDOWN_CONFIG: MarkdownChunkerConfig = {
  chunkSize: 2000,
  chunkOverlap: 200,
};
