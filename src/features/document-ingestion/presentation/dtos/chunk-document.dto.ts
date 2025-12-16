import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class ChunkDocumentDto {
  @ApiProperty({
    description: 'Absolute path to the PDF file to chunk',
    example: '/usr/src/app/documents/example.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiPropertyOptional({
    description: 'Optional document ID (auto-generated from filename if not provided)',
    example: 'my-document-id',
  })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Chunking strategy identifier',
    example: 'recursive-1000-200',
  })
  @IsString()
  @IsOptional()
  chunkStrategy?: string;

  @ApiPropertyOptional({
    description: 'Size of each chunk in characters',
    example: 1000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  @IsOptional()
  chunkSize?: number;

  @ApiPropertyOptional({
    description: 'Number of overlapping characters between chunks',
    example: 200,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  chunkOverlap?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of chunks to process (for testing)',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxChunks?: number;
}

export class ChunkDocumentResponseDto {
  @ApiProperty({
    description: 'ID of the created chunking task',
    example: '507f1f77bcf86cd799439011',
  })
  taskId: string;

  @ApiProperty({
    description: 'Document identifier',
    example: 'example-a1b2c3d4',
  })
  documentId: string;

  @ApiProperty({
    description: 'Total number of chunks created',
    example: 42,
  })
  totalChunks: number;

  @ApiProperty({
    description: 'Current status of the chunking task',
    example: 'completed',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  status: string;
}
