/**
 * Outbound mirror abstraction. CareDroid's own persistence + SSE broadcast (see
 * CollaborationHubService / CollaborationRealtimeService) is always the source of
 * truth and happens independently of this interface — providers here only mirror
 * an already-persisted message outward to an external tool. Implementations must
 * be best-effort: failures are logged, never thrown back into the request path.
 */
export interface OutboundCollaborationMessage {
  channelId: string;
  channelName: string;
  organizationId: string;
  body: string;
  senderDisplayName: string;
  senderType: 'user' | 'system' | 'ai_chief';
  createdAt: string;
}

export interface CollaborationExternalLinkConfig {
  externalChannelId?: string | null;
  config?: Record<string, unknown> | null;
}

export interface CollaborationProvider {
  /** Matches CollaborationExternalProvider enum values, e.g. 'native' | 'slack'. */
  readonly id: string;
  /** Whether this provider has the credentials/config it needs to actually deliver. */
  isConfigured(): boolean;
  sendMessage(
    message: OutboundCollaborationMessage,
    link: CollaborationExternalLinkConfig,
  ): Promise<void>;
}
