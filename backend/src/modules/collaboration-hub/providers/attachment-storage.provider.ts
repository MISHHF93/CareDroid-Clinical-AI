import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface StoredAttachment {
  storageProvider: string;
  storageKey: string;
  url: string | null;
}

export interface AttachmentStorageProvider {
  readonly id: string;
  store(input: { fileName: string; mimeType: string; buffer: Buffer }): Promise<StoredAttachment>;
}

const UPLOAD_DIR = join(process.cwd(), 'backend', 'public', 'collaboration-attachments');

/**
 * Dev-appropriate default: writes to local disk under backend/public so files
 * are servable via the existing static-asset middleware. Swap for an S3/Blob
 * implementation of the same interface for a real deployment — no caller code
 * needs to change since CollaborationHubService depends on the interface only.
 */
@Injectable()
export class LocalDiskAttachmentStorageProvider implements AttachmentStorageProvider {
  readonly id = 'local';
  private readonly logger = new Logger(LocalDiskAttachmentStorageProvider.name);

  async store(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<StoredAttachment> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${randomUUID()}-${safeName}`;
    const filePath = join(UPLOAD_DIR, storageKey);

    await writeFile(filePath, input.buffer);
    this.logger.log(`Stored collaboration attachment ${storageKey} (${input.buffer.length} bytes)`);

    return {
      storageProvider: this.id,
      storageKey,
      url: `/collaboration-attachments/${storageKey}`,
    };
  }
}
