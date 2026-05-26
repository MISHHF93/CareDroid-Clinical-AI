import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddingsService } from './embeddings/openai-embeddings.service';

@Injectable()
export class EmbeddingService {
  constructor(private readonly openAiEmbeddings: OpenAIEmbeddingsService) {}

  async embedQuery(query: string): Promise<number[]> {
    return this.openAiEmbeddings.embed(this.normalizeText(query));
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.openAiEmbeddings.embedBatch(texts.map((text) => this.normalizeText(text)));
  }

  getModel(): string {
    return this.openAiEmbeddings.getModel();
  }

  getDimension(): number {
    return this.openAiEmbeddings.getDimension();
  }

  healthCheck(): Promise<boolean> {
    return this.openAiEmbeddings.healthCheck();
  }

  private normalizeText(text: string): string {
    return String(text || '')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
