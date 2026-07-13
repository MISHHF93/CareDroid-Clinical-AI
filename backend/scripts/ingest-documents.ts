import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RAGService } from '../src/modules/rag/rag.service';
import { IngestDocumentDto, MedicalSource } from '../src/modules/rag/dto/medical-source.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ingestion Script
 *
 * Script to ingest medical documents into the RAG system.
 *
 * Knowledge registry gate (PR-2):
 *   By default, each file must match an accepted artifact in
 *   data/knowledge-registry/ (hash + rag_ingest_allowed).
 *   Skip only for local experiments: KNOWLEDGE_REGISTRY_GATE=0
 *   Preflight: npm run verify:knowledge-registry
 *              npm run gate:knowledge-registry -- --directory data/medical-knowledge
 *
 * Usage:
 *   npm run ingest -- --file path/to/document.txt --type protocol
 *   npm run ingest -- --directory path/to/documents/
 *
 * Supported document types:
 * - protocol: Clinical protocols (ACLS, ATLS, etc.)
 * - guideline: Clinical practice guidelines
 * - drug_info: FDA drug information, pharmacology references
 * - clinical_pathway: Clinical care pathways
 * - reference: General medical reference material
 */

interface IngestionOptions {
  file?: string;
  directory?: string;
  type?: MedicalSource['type'];
  organization?: string;
  specialty?: string;
  chunkSize?: number;
  overlap?: number;
}

async function bootstrap() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = parseArguments(args);

  // Validate options
  if (!options.file && !options.directory) {
    console.error('Error: Either --file or --directory must be specified');
    process.exit(1);
  }

  console.log('🚀 Starting RAG Ingestion Script...\n');

  // Initialize NestJS application
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const ragService = app.get(RAGService);

  try {
    // Get list of files to ingest
    const files = options.directory
      ? getFilesFromDirectory(options.directory)
      : [options.file!];

    console.log(`📚 Found ${files.length} file(s) to ingest\n`);

    // Ingest each file
    let totalChunks = 0;
    let successCount = 0;
    let failCount = 0;

    for (const filePath of files) {
      try {
        console.log(`\n📄 Processing: ${path.basename(filePath)}`);

        // Read file bytes (hash must match registry content_hash over raw bytes)
        const fileBytes = fs.readFileSync(filePath);
        const content = fileBytes.toString('utf-8');

        const gate = assertKnowledgeRegistryAllowsIngest(filePath, fileBytes);
        if (gate.ok === false) {
          throw new Error(gate.reason);
        }
        if (gate.artifactId) {
          console.log(`   🔐 Registry gate: ${gate.artifactId} (${gate.reviewStatus})`);
        }

        // Create medical source metadata
        const source: MedicalSource = {
          id: gate.artifactId || generateSourceId(filePath),
          title: extractTitle(filePath, content),
          type: options.type || detectDocumentType(filePath, content),
          organization: options.organization || gate.publisher,
          specialty: options.specialty || gate.specialty,
          date: new Date().toISOString().split('T')[0],
        };

        // Create ingestion DTO
        const ingestDto: IngestDocumentDto = {
          content,
          source,
          chunkingOptions: {
            chunkSize: options.chunkSize,
            overlap: options.overlap,
          },
        };

        // Ingest document
        const result = await ragService.ingest(ingestDto);

        console.log(`✅ Success: ${result.chunksIngested} chunks ingested`);
        totalChunks += result.chunksIngested;
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed: ${errorMessage}`);
        failCount++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Ingestion Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📦 Total Chunks: ${totalChunks}`);
    console.log('='.repeat(60) + '\n');

    // Get system stats
    const stats = await ragService.getStats();
    console.log('🎯 RAG System Stats:');
    console.log(`   Total Vectors: ${stats.totalVectors}`);
    console.log(`   Index Name: ${stats.indexName}`);
    console.log(`   Embedding Model: ${stats.embeddingModel}`);
    console.log('');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Ingestion failed:', errorMessage);
    process.exit(1);
  } finally {
    await app.close();
  }
}

type KnowledgeRegistryGateResult =
  | {
      ok: true;
      artifactId?: string;
      reviewStatus?: string;
      publisher?: string;
      specialty?: string;
    }
  | { ok: false; reason: string };

/**
 * Enforce data/knowledge-registry acceptance before RAG ingest.
 * Set KNOWLEDGE_REGISTRY_GATE=0 to bypass (local experiments only).
 */
function assertKnowledgeRegistryAllowsIngest(
  filePath: string,
  fileBytes: Buffer,
): KnowledgeRegistryGateResult {
  if (process.env.KNOWLEDGE_REGISTRY_GATE === '0') {
    console.warn('   ⚠️  KNOWLEDGE_REGISTRY_GATE=0 — registry gate bypassed');
    return { ok: true };
  }

  const repoRoot = path.resolve(__dirname, '../..');
  const artifactsDir = path.join(repoRoot, 'data', 'knowledge-registry', 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    return {
      ok: false,
      reason:
        'Knowledge registry missing (data/knowledge-registry/artifacts). Register the source or set KNOWLEDGE_REGISTRY_GATE=0 for local experiments only.',
    };
  }

  const hash = crypto.createHash('sha256').update(fileBytes).digest('hex');
  const rel = path
    .relative(repoRoot, path.resolve(filePath))
    .split(path.sep)
    .join('/');

  const files = fs.readdirSync(artifactsDir).filter((n) => n.endsWith('.json'));
  type ArtifactRow = {
    id?: string;
    content_hash?: string;
    content_path?: string;
    rag_ingest_allowed?: boolean;
    review_status?: string;
    publisher?: string;
    specialty?: string;
    expires_at?: string | null;
  };

  let match: ArtifactRow | undefined;
  for (const name of files) {
    const row = JSON.parse(
      fs.readFileSync(path.join(artifactsDir, name), 'utf8'),
    ) as ArtifactRow;
    if (row.content_hash === hash || row.content_path === rel) {
      match = row;
      break;
    }
  }

  if (!match) {
    return {
      ok: false,
      reason: `No knowledge-registry artifact for ${rel} (hash ${hash.slice(0, 12)}…). Run npm run verify:knowledge-registry and register the file first.`,
    };
  }
  if (match.content_hash && match.content_hash !== hash) {
    return {
      ok: false,
      reason: `Registry hash mismatch for ${match.id}: re-hash content or update artifact.`,
    };
  }
  if (match.rag_ingest_allowed !== true) {
    return {
      ok: false,
      reason: `Artifact ${match.id} has rag_ingest_allowed=false`,
    };
  }
  if (
    match.review_status !== 'accepted' &&
    match.review_status !== 'accepted_with_limitations'
  ) {
    return {
      ok: false,
      reason: `Artifact ${match.id} review_status=${match.review_status} (need accepted*)`,
    };
  }
  if (match.expires_at) {
    const exp = new Date(match.expires_at);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return {
        ok: false,
        reason: `Artifact ${match.id} expired at ${match.expires_at}`,
      };
    }
  }

  return {
    ok: true,
    artifactId: match.id,
    reviewStatus: match.review_status,
    publisher: match.publisher,
    specialty: match.specialty,
  };
}

/**
 * Parse command line arguments
 */
function parseArguments(args: string[]): IngestionOptions {
  const options: IngestionOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--file':
      case '-f':
        options.file = nextArg;
        i++;
        break;
      case '--directory':
      case '-d':
        options.directory = nextArg;
        i++;
        break;
      case '--type':
      case '-t':
        options.type = nextArg as MedicalSource['type'];
        i++;
        break;
      case '--organization':
      case '-o':
        options.organization = nextArg;
        i++;
        break;
      case '--specialty':
      case '-s':
        options.specialty = nextArg;
        i++;
        break;
      case '--chunk-size':
        options.chunkSize = parseInt(nextArg, 10);
        i++;
        break;
      case '--overlap':
        options.overlap = parseInt(nextArg, 10);
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

/**
 * Get all text files from a directory
 */
function getFilesFromDirectory(directory: string): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && /\.(txt|md|text)$/i.test(item)) {
        files.push(fullPath);
      }
    }
  }

  traverse(directory);
  return files;
}

/**
 * Generate a unique source ID from file path
 */
function generateSourceId(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const sanitized = fileName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return sanitized;
}

/**
 * Extract title from file name or content
 */
function extractTitle(filePath: string, content: string): string {
  // Try to find title in first line
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '');
  }

  // Fall back to file name
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Detect document type from file name or content
 */
function detectDocumentType(filePath: string, content: string): MedicalSource['type'] {
  const lowerPath = filePath.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (lowerPath.includes('protocol') || lowerContent.includes('protocol')) {
    return 'protocol';
  }
  if (lowerPath.includes('guideline') || lowerContent.includes('guideline')) {
    return 'guideline';
  }
  if (lowerPath.includes('drug') || lowerPath.includes('medication') || lowerContent.includes('pharmacology')) {
    return 'drug_info';
  }
  if (lowerPath.includes('pathway') || lowerContent.includes('clinical pathway')) {
    return 'clinical_pathway';
  }

  return 'reference';
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
RAG Ingestion Script - CareDroid Medical Knowledge Base

Usage:
  npm run ingest -- [options]

Options:
  -f, --file <path>          Path to a single document to ingest
  -d, --directory <path>     Path to a directory of documents to ingest
  -t, --type <type>          Document type (protocol|guideline|drug_info|clinical_pathway|reference)
  -o, --organization <name>  Organization that published the document
  -s, --specialty <name>     Medical specialty (cardiology, emergency, etc.)
  --chunk-size <number>      Chunk size in tokens (default: 512)
  --overlap <number>         Overlap between chunks in tokens (default: 50)
  -h, --help                 Show this help message

Examples:
  # Ingest a single protocol
  npm run ingest -- --file docs/acls-protocol.txt --type protocol --organization "American Heart Association"

  # Ingest all documents in a directory
  npm run ingest -- --directory docs/protocols/ --type protocol

  # Ingest with custom chunking
  npm run ingest -- --file large-textbook.txt --chunk-size 1024 --overlap 100

Document Types:
  protocol         - Clinical protocols (ACLS, ATLS, PALS, etc.)
  guideline        - Clinical practice guidelines
  drug_info        - FDA drug information, pharmacology references
  clinical_pathway - Clinical care pathways, order sets
  reference        - General medical reference material
  `);
}

// Run script
bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
