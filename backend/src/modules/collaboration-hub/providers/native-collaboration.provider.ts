import { Injectable, Logger } from '@nestjs/common';
import {
  CollaborationExternalLinkConfig,
  CollaborationProvider,
  OutboundCollaborationMessage,
} from './collaboration-provider.interface';

/**
 * Reference implementation of CollaborationProvider for CareDroid's own store.
 * Persistence and SSE broadcast already happen in CollaborationHubService /
 * CollaborationRealtimeService before the provider registry ever runs, so this
 * class is intentionally a no-op — it exists so the abstraction has a "native
 * first" concrete member (per the platform requirement) and so the registry
 * always has at least one always-configured provider to reason about in tests.
 */
@Injectable()
export class NativeCollaborationProvider implements CollaborationProvider {
  readonly id = 'native';
  private readonly logger = new Logger(NativeCollaborationProvider.name);

  isConfigured(): boolean {
    return true;
  }

  async sendMessage(
    message: OutboundCollaborationMessage,
    _link: CollaborationExternalLinkConfig,
  ): Promise<void> {
    this.logger.verbose(`Native delivery already handled for channel ${message.channelId}`);
  }
}
