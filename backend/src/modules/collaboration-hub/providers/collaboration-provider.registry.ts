import { Injectable, Logger } from '@nestjs/common';
import { CollaborationExternalLink } from '../entities/collaboration-external-link.entity';
import {
  CollaborationProvider,
  OutboundCollaborationMessage,
} from './collaboration-provider.interface';
import { NativeCollaborationProvider } from './native-collaboration.provider';
import { SlackCollaborationProvider } from './slack-collaboration.provider';

/**
 * Fans an already-persisted message out to whichever external providers a
 * channel has an active CollaborationExternalLink for. Never blocks or throws
 * back into the caller — mirroring is best-effort by design (see interface doc).
 */
@Injectable()
export class CollaborationProviderRegistry {
  private readonly logger = new Logger(CollaborationProviderRegistry.name);
  private readonly providers: CollaborationProvider[];

  constructor(native: NativeCollaborationProvider, slack: SlackCollaborationProvider) {
    this.providers = [native, slack];
  }

  async dispatch(
    message: OutboundCollaborationMessage,
    links: CollaborationExternalLink[],
  ): Promise<void> {
    const activeLinks = links.filter((link) => link.enabled);
    if (activeLinks.length === 0) return;

    await Promise.allSettled(
      activeLinks.map(async (link) => {
        const provider = this.providers.find((candidate) => candidate.id === link.provider);
        if (!provider) {
          this.logger.warn(`No provider registered for '${link.provider}'`);
          return;
        }
        if (!provider.isConfigured()) return;
        await provider.sendMessage(message, link);
      }),
    );
  }
}
