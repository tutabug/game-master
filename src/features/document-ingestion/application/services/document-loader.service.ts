import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Document } from 'langchain/document';

@Injectable()
export class DocumentLoaderService {
  async loadPdfWithMetadata(filePath: string): Promise<Document[]> {
    const loader = new PDFLoader(filePath);
    return loader.load();
  }
}
