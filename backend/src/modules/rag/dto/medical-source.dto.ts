/**
 * Medical Source DTO
 *
 * Represents a citable medical source that can be referenced in AI responses.
 * Used for providing citations and maintaining clinical accuracy.
 */

export interface MedicalSource {
  /**
   * Unique identifier for the source
   */
  id: string;

  /**
   * Display title for the citation
   */
  title: string;

  /**
   * Type of medical source
   */
  type:
    | 'protocol'
    | 'guideline'
    | 'drug_info'
    | 'clinical_pathway'
    | 'reference'
    | 'textbook'
    | 'journal';

  /**
   * Organization that published the source
   */
  organization?: string;

  /**
   * Authors (for journal articles, textbooks)
   */
  authors?: string[];

  /**
   * Publication date or last updated
   */
  date?: string;

  /**
   * URL to the full source
   */
  url?: string;

  /**
   * DOI for journal articles
   */
  doi?: string;

  /**
   * Specialty or medical field
   */
  specialty?: string;

  /**
   * Short description or abstract
   */
  description?: string;

  /**
   * Evidence level (for clinical guidelines)
   */
  evidenceLevel?: 'A' | 'B' | 'C' | 'expert_opinion';

  /**
   * Whether this source is considered authoritative
   */
  authoritative?: boolean;

  /**
   * Tags for categorization
   */
  tags?: string[];
}

export interface IngestDocumentDto {
  /**
   * The full text content to ingest
   */
  content: string;

  /**
   * Metadata about the document
   */
  source: MedicalSource;

  /**
   * Chunking strategy options
   */
  chunkingOptions?: {
    /**
     * Target chunk size in tokens
     */
    chunkSize?: number;

    /**
     * Overlap between chunks in tokens
     */
    overlap?: number;

    /**
     * Whether to respect paragraph boundaries
     */
    respectBoundaries?: boolean;
  };
}

export interface DocumentChunk {
  /**
   * The text content of the chunk
   */
  text: string;

  /**
   * Start position in the original document (character index)
   */
  startPos: number;

  /**
   * End position in the original document (character index)
   */
  endPos: number;

  /**
   * Chunk index (0-based)
   */
  chunkIndex: number;

  /**
   * Token count for this chunk
   */
  tokenCount: number;

  /**
   * Metadata inherited from source
   */
  metadata: {
    sourceId: string;
    title: string;
    type: MedicalSource['type'];
    organization?: string;
    date?: string;
    url?: string;
    chunkIndex: number;
    totalChunks: number;
    specialty?: string;
    tags?: string[];
  };
}
