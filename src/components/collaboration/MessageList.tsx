import { useEffect, useRef } from 'react';
import { Stack } from '../layout';
import { Text, Avatar } from '../primitives';
import type { CollaborationMessage } from '../../store/collaborationStore';
import './CollaborationHub.css';

type MessageListProps = {
  messages: CollaborationMessage[];
  currentUserId: string | null;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: CollaborationMessage) => void;
};

const QUICK_REACTIONS = ['👍', '✅', '👀', '🙏'];

function senderLabel(message: CollaborationMessage): string {
  if (message.senderType === 'ai_chief') return 'AI Chief';
  if (message.senderType === 'system') return 'CareDroid';
  return message.senderId ? `Staff ${message.senderId.slice(0, 8)}` : 'Unknown';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageList({
  messages,
  currentUserId,
  onReact,
  onDelete,
  onReply,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <Stack gap={3} className="cd-collab-message-list">
      {messages.map((message) => {
        const isMine = message.senderId != null && message.senderId === currentUserId;
        const isSystem = message.senderType !== 'user';
        return (
          <div
            key={message.id}
            className={`cd-collab-message${isSystem ? ' cd-collab-message--system' : ''}${isMine ? ' cd-collab-message--mine' : ''}`}
          >
            {!isSystem && <Avatar name={senderLabel(message)} size="sm" />}
            <div className="cd-collab-message__body">
              <div className="cd-collab-message__meta">
                <Text as="span" size="xs" weight="semibold">
                  {senderLabel(message)}
                </Text>
                <Text as="span" size="2xs" color="secondary">
                  {formatTime(message.createdAt)}
                  {message.editedAt ? ' (edited)' : ''}
                </Text>
              </div>
              <Text as="p" size="sm">
                {message.body}
              </Text>
              {!isSystem && (
                <div className="cd-collab-message__actions">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="cd-collab-message__action"
                      onClick={() => onReact(message.id, emoji)}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="cd-collab-message__action-text"
                    onClick={() => onReply(message)}
                  >
                    Reply
                  </button>
                  {isMine && (
                    <button
                      type="button"
                      className="cd-collab-message__action-text"
                      onClick={() => onDelete(message.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {messages.length === 0 && (
        <Text as="p" size="sm" color="secondary">
          No messages yet. Say hello.
        </Text>
      )}
      <div ref={bottomRef} />
    </Stack>
  );
}

export default MessageList;
