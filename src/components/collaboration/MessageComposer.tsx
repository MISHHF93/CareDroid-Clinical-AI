import { useRef, useState } from 'react';
import { Textarea, Button, Text } from '../primitives';
import type { CollaborationMessage } from '../../store/collaborationStore';
import './CollaborationHub.css';

type MessageComposerProps = {
  disabled?: boolean;
  replyingTo?: CollaborationMessage | null;
  onCancelReply?: () => void;
  onSend: (body: string, threadRootId?: string) => Promise<void> | void;
  onTypingChange?: (isTyping: boolean) => void;
};

export function MessageComposer({ disabled, replyingTo, onCancelReply, onSend, onTypingChange }: MessageComposerProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const notifyTyping = (isTyping: boolean) => {
    onTypingChange?.(isTyping);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => onTypingChange?.(false), 4000);
    }
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed, replyingTo?.id);
      setValue('');
      notifyTyping(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="cd-collab-composer">
      {replyingTo && (
        <div className="cd-collab-composer__reply-banner">
          <Text as="span" size="xs" color="secondary">
            Replying to: {replyingTo.body.slice(0, 80)}
          </Text>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply">
            ✕
          </button>
        </div>
      )}
      <Textarea
        value={value}
        disabled={disabled || sending}
        placeholder={disabled ? 'You do not have permission to post in this channel.' : 'Message this channel…'}
        rows={2}
        onChange={(event) => {
          setValue(event.target.value);
          notifyTyping(event.target.value.length > 0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
      />
      <Button variant="primary" size="sm" disabled={disabled || sending || !value.trim()} onClick={() => void handleSend()}>
        Send
      </Button>
    </div>
  );
}

export default MessageComposer;
