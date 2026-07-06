import { useCallback, useEffect, useState } from 'react';
import { Text, Button } from '../primitives';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import './CollaborationHub.css';
import { useUser } from '../../contexts/UserContext';
import useSecurityAccess from '../../hooks/useSecurityAccess';
import { CAREDROID_PERMISSIONS } from '../../lib/users/permissions';
import * as collaborationApi from '../../services/collaborationApi';
import type { CollaborationMessage } from '../../store/collaborationStore';

type PatientDiscussionPanelProps = {
  patientId: string;
};

/**
 * Compact, self-contained discussion thread for a single patient, embedded in
 * PatientDetailPanel so staff can collaborate without leaving patient context.
 * Deliberately fetch-on-demand rather than a second live SSE connection —
 * the full Collaboration Hub page already owns the realtime stream; this
 * panel just needs to read/post into the same auto-created patient thread.
 */
export function PatientDiscussionPanel({ patientId }: PatientDiscussionPanelProps) {
  const { user } = useUser();
  const { can } = useSecurityAccess();
  const canRead = can(CAREDROID_PERMISSIONS.COLLABORATION_READ);
  const canPost = can(CAREDROID_PERMISSIONS.COLLABORATION_POST);

  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const threadResult = await collaborationApi.fetchPatientThread(patientId);
    if (threadResult.ok && threadResult.data?.id) {
      setChannelId(threadResult.data.id);
      const messagesResult = await collaborationApi.fetchMessages(threadResult.data.id, { limit: 50 });
      if (messagesResult.ok && Array.isArray(messagesResult.data)) {
        setMessages(messagesResult.data);
      }
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    if (canRead) void load();
  }, [canRead, load]);

  if (!canRead) return null;

  return (
    <div className="cd-collab-patient-panel">
      <div className="cd-collab-patient-panel__header">
        <Text as="h3" size="sm" weight="semibold">
          Discussion
        </Text>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <Text as="p" size="xs" color="secondary">
          Loading discussion…
        </Text>
      ) : (
        <>
          <div className="cd-collab-patient-panel__messages">
            <MessageList
              messages={messages.filter((m) => !m.threadRootId)}
              currentUserId={user?.id || null}
              onReact={(messageId, emoji) => void collaborationApi.addReaction(messageId, emoji)}
              onDelete={(messageId) => {
                void collaborationApi.deleteMessage(messageId).then(() => load());
              }}
              onReply={() => {
                // Threaded replies are supported by the API; the compact patient
                // panel keeps a flat view and defers threading UI to the full hub.
              }}
            />
          </div>
          <MessageComposer
            disabled={!canPost || !channelId}
            onSend={async (body) => {
              if (!channelId) return;
              await collaborationApi.postMessage(channelId, { body });
              await load();
            }}
          />
        </>
      )}
    </div>
  );
}

export default PatientDiscussionPanel;
