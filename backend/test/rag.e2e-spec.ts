import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from '../src/modules/rag/rag.service';
import { OpenAIEmbeddingsService } from '../src/modules/rag/embeddings/openai-embeddings.service';
import { PineconeService } from '../src/modules/rag/vector-db/pinecone.service';
import { DocumentChunker } from '../src/modules/rag/utils/document-chunker';
import { MedicalSource, IngestDocumentDto } from '../src/modules/rag/dto/medical-source.dto';
import { RAGRetrievalOptions } from '../src/modules/rag/dto/rag-context.dto';
import { ToolMetricsService } from '../src/modules/metrics/tool-metrics.service';

/**
 * RAG System E2E Tests
 *
 * Tests the complete RAG pipeline:
 * 1. Document chunking
 * 2. Embedding generation
 * 3. Vector storage
 * 4. Retrieval
 * 5. Source extraction
 *
 * Note: These tests require a valid Pinecone API key.
 * Set PINECONE_API_KEY in .env.test
 */

const describeIfLiveRagConfigured = process.env.PINECONE_API_KEY ? describe : describe.skip;

describeIfLiveRagConfigured('RAG System (e2e)', () => {
  let module: TestingModule;
  let ragService: RAGService;
  let embeddingsService: OpenAIEmbeddingsService;
  let vectorDb: PineconeService;
  let documentChunker: DocumentChunker;

  // Sample medical document for testing
  const sampleDocument = `
# Epinephrine - Emergency Medicine

## Description
Epinephrine is a sympathomimetic amine with both alpha and beta adrenergic activity.

## Indications
- Cardiac arrest (VF, pVT, PEA, asystole)
- Anaphylaxis
- Severe bronchospasm

## Mechanism of Action
Stimulates alpha-1, beta-1, and beta-2 receptors:
- Alpha-1: Peripheral vasoconstriction
- Beta-1: Increased heart rate and contractility
- Beta-2: Bronchodilation

## Dosing
### Cardiac Arrest
- IV/IO: 1 mg (1:10,000) every 3-5 minutes
- Continue until ROSC or termination of resuscitation

### Anaphylaxis
- IM: 0.3-0.5 mg (1:1,000) into anterolateral thigh
- May repeat every 5-15 minutes as needed

## Adverse Effects
- Tachycardia and palpitations
- Hypertension
- Myocardial ischemia
- Anxiety and tremor

## Clinical Pearls
- In cardiac arrest, push epinephrine - don't delay for perfect IV access
- IM route preferred for anaphylaxis (faster than subcutaneous)
- Higher doses in cardiac arrest do not improve survival
  `.trim();

  const sampleSource: MedicalSource = {
    id: 'epi-test-doc',
    title: 'Epinephrine - Emergency Medicine',
    type: 'drug_info',
    organization: 'Test Medical Center',
    specialty: 'emergency',
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
      ],
      providers: [
        RAGService,
        OpenAIEmbeddingsService,
        PineconeService,
        {
          provide: ToolMetricsService,
          useValue: {
            recordRagRelevanceScore: jest.fn(),
            recordRagRetrieval: jest.fn(),
          },
        },
      ],
    }).compile();

    ragService = module.get<RAGService>(RAGService);
    embeddingsService = module.get<OpenAIEmbeddingsService>(OpenAIEmbeddingsService);
    vectorDb = module.get<PineconeService>(PineconeService);
    documentChunker = new DocumentChunker();

    // Initialize Pinecone
    await vectorDb.initialize();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await ragService.deleteDocument(sampleSource.id);
    } catch (_error) {
      // Ignore cleanup errors
    }

    documentChunker.dispose();
    await module.close();
  });

  describe('Document Chunker', () => {
    it('should chunk document into multiple chunks', () => {
      const chunks = documentChunker.chunkDocument({
        content: sampleDocument,
        source: sampleSource,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('text');
      expect(chunks[0]).toHaveProperty('metadata');
      expect(chunks[0].metadata.sourceId).toBe(sampleSource.id);
    });

    it('should respect chunk size limits', () => {
      const chunkSize = 200;
      const chunks = documentChunker.chunkDocument({
        content: sampleDocument,
        source: sampleSource,
        chunkingOptions: { chunkSize, overlap: 0 },
      });

      for (const chunk of chunks) {
        expect(chunk.tokenCount).toBeLessThanOrEqual(chunkSize);
      }
    });

    it('should create overlapping chunks', () => {
      const chunkSize = 100;
      const overlap = 20;
      const chunks = documentChunker.chunkDocument({
        content: sampleDocument,
        source: sampleSource,
        chunkingOptions: { chunkSize, overlap },
      });

      if (chunks.length > 1) {
        // Check that consecutive chunks share some text
        const firstChunkEnd = chunks[0].text.slice(-50);
        const secondChunkStart = chunks[1].text.slice(0, 100);
        expect(secondChunkStart).toContain(firstChunkEnd.split(' ').slice(-2).join(' '));
      }
    });

    it('should include chunk metadata', () => {
      const chunks = documentChunker.chunkDocument({
        content: sampleDocument,
        source: sampleSource,
      });

      expect(chunks[0].metadata).toMatchObject({
        sourceId: sampleSource.id,
        title: sampleSource.title,
        type: sampleSource.type,
        organization: sampleSource.organization,
        specialty: sampleSource.specialty,
      });
    });

    it('should number chunks correctly', () => {
      const chunks = documentChunker.chunkDocument({
        content: sampleDocument,
        source: sampleSource,
      });

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].chunkIndex).toBe(i);
        expect(chunks[i].metadata.chunkIndex).toBe(i);
        expect(chunks[i].metadata.totalChunks).toBe(chunks.length);
      }
    });
  });

  describe('Embeddings Service', () => {
    it('should generate embedding for text', async () => {
      const text = 'Epinephrine is used for cardiac arrest';
      const embedding = await embeddingsService.embed(text);

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(embeddingsService.getDimension());
      expect(typeof embedding[0]).toBe('number');
    });

    it('should generate batch embeddings', async () => {
      const texts = [
        'Epinephrine for cardiac arrest',
        'Dosing: 1 mg IV every 3-5 minutes',
        'Anaphylaxis treatment with epinephrine',
      ];
      const embeddings = await embeddingsService.embedBatch(texts);

      expect(embeddings.length).toBe(texts.length);
      expect(embeddings[0].length).toBe(embeddingsService.getDimension());
    });

    it('should handle empty batch', async () => {
      const embeddings = await embeddingsService.embedBatch([]);
      expect(embeddings).toEqual([]);
    });

    it('should pass health check', async () => {
      const healthy = await embeddingsService.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Vector Database', () => {
    it('should connect to Pinecone', async () => {
      const stats = await vectorDb.getStats();
      expect(stats).toHaveProperty('totalVectors');
      expect(stats).toHaveProperty('indexName');
      expect(stats).toHaveProperty('dimension');
    });

    it('should upsert and query vectors', async () => {
      const testText = 'Test medical knowledge for RAG';
      const embedding = await embeddingsService.embed(testText);

      // Upsert
      await vectorDb.upsert({
        id: 'test-vector-1',
        vector: embedding,
        text: testText,
        metadata: {
          sourceId: 'test-source',
          title: 'Test Document',
          type: 'reference',
        },
      });

      // Query (wait a bit for indexing)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const results = await vectorDb.query(embedding, {
        topK: 5,
        minScore: 0.5,
      });

      expect(results.matches.length).toBeGreaterThan(0);
      expect(results.matches[0].score).toBeGreaterThan(0.5);
    });

    it('should delete vectors', async () => {
      await vectorDb.delete(['test-vector-1']);
      // Deletion is successful if no error is thrown
      expect(true).toBe(true);
    });

    it('should pass health check', async () => {
      const healthy = await vectorDb.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('RAG Service - Ingestion', () => {
    it('should ingest document successfully', async () => {
      const ingestDto: IngestDocumentDto = {
        content: sampleDocument,
        source: sampleSource,
      };

      const result = await ragService.ingest(ingestDto);

      expect(result.success).toBe(true);
      expect(result.chunksIngested).toBeGreaterThan(0);
      expect(result.sourceId).toBe(sampleSource.id);
    });

    it('should handle empty content', async () => {
      const ingestDto: IngestDocumentDto = {
        content: '',
        source: { ...sampleSource, id: 'empty-test' },
      };

      await expect(ragService.ingest(ingestDto)).rejects.toThrow();
    });

    it('should ingest multiple documents in batch', async () => {
      const documents: IngestDocumentDto[] = [
        {
          content: 'Document 1: Atropine is used for bradycardia',
          source: { ...sampleSource, id: 'batch-test-1', title: 'Atropine' },
        },
        {
          content: 'Document 2: Adenosine is used for SVT',
          source: { ...sampleSource, id: 'batch-test-2', title: 'Adenosine' },
        },
      ];

      const result = await ragService.ingestBatch(documents);

      expect(result.successful).toBeGreaterThan(0);
      expect(result.totalChunks).toBeGreaterThan(0);

      // Cleanup
      await ragService.deleteDocument('batch-test-1');
      await ragService.deleteDocument('batch-test-2');
    });
  });

  describe('RAG Service - Retrieval', () => {
    beforeAll(async () => {
      // Ensure test document is ingested
      await ragService.ingest({
        content: sampleDocument,
        source: sampleSource,
      });

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    it('should retrieve relevant context', async () => {
      const query = 'What is the dose of epinephrine for cardiac arrest?';
      const context = await ragService.retrieve(query);

      expect(context.chunks.length).toBeGreaterThan(0);
      expect(context.sources.length).toBeGreaterThan(0);
      expect(context.confidence).toBeGreaterThan(0);
      expect(context.query).toBe(query);
    });

    it('should filter by document type', async () => {
      const options: RAGRetrievalOptions = {
        documentType: 'drug_info',
        topK: 5,
      };

      const context = await ragService.retrieve('epinephrine dosing', options);

      for (const chunk of context.chunks) {
        expect(chunk.metadata.type).toBe('drug_info');
      }
    });

    it('should filter by specialty', async () => {
      const options: RAGRetrievalOptions = {
        specialty: 'emergency',
        topK: 5,
      };

      const context = await ragService.retrieve('epinephrine', options);

      for (const chunk of context.chunks) {
        expect(chunk.metadata.specialty).toBe('emergency');
      }
    });

    it('should respect topK parameter', async () => {
      const topK = 3;
      const context = await ragService.retrieve('epinephrine', { topK });

      expect(context.chunks.length).toBeLessThanOrEqual(topK);
    });

    it('should respect minScore parameter', async () => {
      const minScore = 0.8;
      const context = await ragService.retrieve('epinephrine', { minScore });

      for (const chunk of context.chunks) {
        expect(chunk.score).toBeGreaterThanOrEqual(minScore);
      }
    });

    it('should include embeddings when requested', async () => {
      const context = await ragService.retrieve('epinephrine', {
        includeEmbeddings: true,
      });

      if (context.chunks.length > 0) {
        expect(context.chunks[0].embedding).toBeDefined();
        expect(Array.isArray(context.chunks[0].embedding)).toBe(true);
      }
    });

    it('should extract unique sources', async () => {
      const context = await ragService.retrieve('epinephrine dosing cardiac arrest');

      expect(context.sources.length).toBeGreaterThan(0);
      const sourceIds = context.sources.map((s) => s.id);
      const uniqueIds = [...new Set(sourceIds)];
      expect(sourceIds.length).toBe(uniqueIds.length);
    });

    it('should calculate confidence score', async () => {
      const context = await ragService.retrieve('epinephrine');

      expect(context.confidence).toBeGreaterThan(0);
      expect(context.confidence).toBeLessThanOrEqual(1);
    });

    it('should include latency metrics', async () => {
      const context = await ragService.retrieve('epinephrine');

      expect(context.latencyMs).toBeGreaterThan(0);
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should return empty results for irrelevant query', async () => {
      const context = await ragService.retrieve('quantum physics string theory', {
        minScore: 0.9,
      });

      expect(context.chunks.length).toBe(0);
      expect(context.sources.length).toBe(0);
    });
  });

  describe('RAG Service - Management', () => {
    it('should get system stats', async () => {
      const stats = await ragService.getStats();

      expect(stats).toHaveProperty('totalVectors');
      expect(stats).toHaveProperty('indexName');
      expect(stats).toHaveProperty('embeddingModel');
      expect(stats).toHaveProperty('embeddingDimension');
      expect(stats.embeddingDimension).toBe(1536);
    });

    it('should pass health check', async () => {
      const health = await ragService.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.components.embeddings).toBe(true);
      expect(health.components.vectorDb).toBe(true);
    });

    it('should delete document', async () => {
      // Ingest a test document
      await ragService.ingest({
        content: 'Test document for deletion',
        source: { ...sampleSource, id: 'delete-test', title: 'Delete Test' },
      });

      // Delete it
      await ragService.deleteDocument('delete-test');

      // Verify deletion (query should not return it)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const context = await ragService.retrieve('test document for deletion', {
        minScore: 0.9,
      });

      const hasDeletedDoc = context.chunks.some(
        (chunk) => chunk.metadata.sourceId === 'delete-test',
      );
      expect(hasDeletedDoc).toBe(false);
    });
  });

  describe('RAG Integration - Real-World Scenarios', () => {
    it('should handle medical query workflow', async () => {
      // 1. User asks clinical question
      const clinicalQuery = 'How do I treat anaphylaxis with epinephrine?';

      // 2. Retrieve relevant context
      const context = await ragService.retrieve(clinicalQuery, {
        topK: 5,
        minScore: 0.7,
        documentType: 'drug_info',
      });

      // 3. Verify we got relevant information
      expect(context.chunks.length).toBeGreaterThan(0);
      expect(context.confidence).toBeGreaterThan(0.5);

      // 4. Check that retrieved text mentions anaphylaxis
      const combinedText = context.chunks
        .map((c) => c.text)
        .join(' ')
        .toLowerCase();
      expect(combinedText).toContain('anaphylaxis');

      // 5. Verify sources are citable
      expect(context.sources.length).toBeGreaterThan(0);
      expect(context.sources[0]).toHaveProperty('title');
      expect(context.sources[0]).toHaveProperty('organization');
    });

    it('should handle complex multi-concept query', async () => {
      const complexQuery = 'What are the indications, dosing, and adverse effects of epinephrine?';

      const context = await ragService.retrieve(complexQuery, { topK: 10 });

      // Should retrieve multiple chunks covering different aspects
      expect(context.chunks.length).toBeGreaterThan(2);

      const combinedText = context.chunks
        .map((c) => c.text)
        .join(' ')
        .toLowerCase();

      // Check for multiple concepts
      const hasIndications =
        combinedText.includes('indication') ||
        combinedText.includes('cardiac arrest') ||
        combinedText.includes('anaphylaxis');
      const hasDosing = combinedText.includes('dos') || combinedText.includes('mg');
      const hasAdverse =
        combinedText.includes('adverse') ||
        combinedText.includes('tachycardia') ||
        combinedText.includes('hypertension');

      expect(hasIndications).toBe(true);
      expect(hasDosing).toBe(true);
      expect(hasAdverse).toBe(true);
    });

    it('should maintain retrieval performance', async () => {
      const startTime = Date.now();

      const context = await ragService.retrieve('epinephrine cardiac arrest', {
        topK: 5,
      });

      const retrievalTime = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(retrievalTime).toBeLessThan(5000);
      expect(context.latencyMs).toBeLessThan(5000);
    });
  });
});
