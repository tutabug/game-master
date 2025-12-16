import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChunkDocumentDto {
  @ApiProperty({
    description: 'Filename of the PDF document in the documents folder',
    example: 'SRD_CC_v5.2.1.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;
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
