import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { Document } from 'langchain/document';
import * as path from 'path';

@Injectable()
export class DocumentLoaderService {
  async loadPdfWithMetadata(filePath: string): Promise<Document[]> {
    const loader = new PDFLoader(filePath);
    return loader.load();
  }

  async loadMarkdown(filePath: string): Promise<Document[]> {
    const loader = new TextLoader(filePath);
    const docs = await loader.load();
    docs.forEach((doc) => {
      doc.metadata.source = filePath;
      doc.metadata.format = 'markdown';
    });
    return docs;
  }

  async loadDocument(filePath: string): Promise<Document[]> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.pdf':
        return this.loadPdfWithMetadata(filePath);
      case '.md':
      case '.markdown':
        return this.loadMarkdown(filePath);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }
}
