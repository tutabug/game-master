import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChunkDocumentUseCase } from '../../application/use-cases/chunk-document.use-case';
import { ChunkDocumentDto, ChunkDocumentResponseDto } from '../dtos/chunk-document.dto';

@ApiTags('document-ingestion')
@Controller('document-ingestion')
export class DocumentIngestionController {
  constructor(private readonly chunkDocumentUseCase: ChunkDocumentUseCase) {}

  @Post('chunk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Chunk a PDF document',
    description:
      'Loads a PDF document, splits it into chunks, and stores them in MongoDB. ' +
      'Returns a task ID that can be used to track the chunking process.',
  })
  @ApiBody({ type: ChunkDocumentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document successfully chunked and stored',
    type: ChunkDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error during document chunking',
  })
  async chunkDocument(@Body() dto: ChunkDocumentDto): Promise<ChunkDocumentResponseDto> {
    const result = await this.chunkDocumentUseCase.execute(dto.filePath, {
      documentId: dto.documentId,
      chunkStrategy: dto.chunkStrategy,
      chunkSize: dto.chunkSize,
      chunkOverlap: dto.chunkOverlap,
      maxChunks: dto.maxChunks,
    });

    return {
      taskId: result.taskId,
      documentId: result.documentId,
      totalChunks: result.totalChunks,
      status: result.status,
    };
  }
}
