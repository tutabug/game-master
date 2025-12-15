export const EMBEDDING_DEFAULTS = {
  MODEL: 'nomic-embed-text',
  DIMENSION: 768,
} as const;

export const CHUNKING_DEFAULTS = {
  STRATEGY: 'recursive-1000-200',
  SIZE: 1000,
  OVERLAP: 200,
} as const;

export const DOCUMENT_DEFAULTS = {
  ID: 'dnd-srd-5.2.1',
  VERSION: 'v1',
} as const;
