import { Injectable, Logger } from '@nestjs/common';
import {
  CollaborationExternalLinkConfig,
  CollaborationProvider,
  OutboundCollaborationMessage,
} from './collaboration-provider.interface';

const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

/**
 * Proof-of-concept external adapter for the CollaborationProvider abstraction.
 * No-ops (with a warning log) unless SLACK_BOT_TOKEN is configured — this
 * codebase has no real Slack workspace credentials to test against, so this
 * class is structurally complete but not live-verified end-to-end. See
 * docs/DOCUMENTATION_CENTER.md-style reporting note in the final delivery report.
 */
@Injectable()
export class SlackCollaborationProvider implements CollaborationProvider {
  readonly id = 'slack';
  private readonly logger = new Logger(SlackCollaborationProvider.name);

  isConfigured(): boolean {
    return Boolean(process.env.SLACK_BOT_TOKEN);
  }

  async sendMessage(
    message: OutboundCollaborationMessage,
    link: CollaborationExternalLinkConfig,
  ): Promise<void> {
    const token = process.env.SLACK_BOT_TOKEN;
    const targetChannel =
      link.externalChannelId || (link.config?.slackChannelId as string | undefined);

    if (!token || !targetChannel) {
      this.logger.warn(
        `Slack mirror skipped for channel ${message.channelId}: SLACK_BOT_TOKEN or externalChannelId not configured.`,
      );
      return;
    }

    try {
      const response = await fetch(SLACK_POST_MESSAGE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          channel: targetChannel,
          text: `*${message.senderDisplayName}* (${message.channelName}): ${message.body}`,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        this.logger.error(`Slack mirror failed for channel ${message.channelId}: ${payload.error}`);
      }
    } catch (error) {
      this.logger.error(
        `Slack mirror threw for channel ${message.channelId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
