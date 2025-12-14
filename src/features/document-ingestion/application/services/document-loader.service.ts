import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';

@Injectable()
export class DocumentLoaderService {
  async loadPdf(filePath: string): Promise<string> {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    return docs.map((doc) => doc.pageContent).join('\n');
  }

  async loadPdfWithMetadata(filePath: string): Promise<any[]> {
    throw new Error('Method not implemented');
  }
}
