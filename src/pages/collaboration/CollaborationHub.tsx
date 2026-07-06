import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text } from '../../components/primitives';
import ChannelList from '../../components/collaboration/ChannelList';
import MessageList from '../../components/collaboration/MessageList';
import MessageComposer from '../../components/collaboration/MessageComposer';
import '../../components/collaboration/CollaborationHub.css';
import { useUser } from '../../contexts/UserContext';
import useSecurityAccess from '../../hooks/useSecurityAccess';
import { CAREDROID_PERMISSIONS } from '../../lib/users/permissions';
import { useCollaborationStore, type CollaborationMessage } from '../../store/collaborationStore';
import * as collaborationApi from '../../services/collaborationApi';
import { startCollaborationRealtime } from '../../services/collaborationRealtimeService';

export function CollaborationHub() {
  const { user } = useUser();
  const { can } = useSecurityAccess();
  const canRead = can(CAREDROID_PERMISSIONS.COLLABORATION_READ);
  const canPost = can(CAREDROID_PERMISSIONS.COLLABORATION_POST);

  const channels = useCollaborationStore((state) => state.channels);
  const activeChannelId = useCollaborationStore((state) => state.activeChannelId);
  const messagesByChannelId = useCollaborationStore((state) => state.messagesByChannelId);
  const setChannels = useCollaborationStore((state) => state.setChannels);
  const setActiveChannel = useCollaborationStore((state) => state.setActiveChannel);
  const setMessages = useCollaborationStore((state) => state.setMessages);
  const removeMessage = useCollaborationStore((state) => state.removeMessage);
  const dispatchRealtimeEvent = useCollaborationStore((state) => state.dispatchRealtimeEvent);
  const setConnectionStatus = useCollaborationStore((state) => state.setConnectionStatus);
  const unreadCountForChannel = useCollaborationStore((state) => state.unreadCountForChannel);
  const connectionStatus = useCollaborationStore((state) => state.connectionStatus);

  const [replyingTo, setReplyingTo] = useState<CollaborationMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChannels = useCallback(async () => {
    const result = await collaborationApi.fetchChannels();
    if (result.ok && Array.isArray(result.data)) {
      setChannels(result.data);
      if (!activeChannelId && result.data.length > 0) {
        setActiveChannel(result.data[0].channel.id);
      }
    }
  }, [activeChannelId, setActiveChannel, setChannels]);

  const loadMessages = useCallback(
    async (channelId: string) => {
      const result = await collaborationApi.fetchMessages(channelId, { limit: 100 });
      if (result.ok && Array.isArray(result.data)) {
        setMessages(channelId, result.data);
      }
    },
    [setMessages],
  );

  useEffect(() => {
    if (!canRead) return;
    void loadChannels().finally(() => setLoading(false));
  }, [canRead]);

  useEffect(() => {
    if (!canRead || !activeChannelId) return;
    void loadMessages(activeChannelId);
  }, [activeChannelId, canRead, loadMessages]);

  useEffect(() => {
    if (!canRead) return () => {};
    const stop = startCollaborationRealtime({
      onEvent: dispatchRealtimeEvent,
      onStatus: setConnectionStatus,
      onPoll: async () => {
        await loadChannels();
        if (activeChannelId) await loadMessages(activeChannelId);
      },
    });
    return stop;
  }, [canRead]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) || null,
    [channels, activeChannelId],
  );
  const activeMessages = activeChannelId ? messagesByChannelId[activeChannelId] || [] : [];

  const handleSend = useCallback(
    async (body: string, threadRootId?: string) => {
      if (!activeChannelId) return;
      await collaborationApi.postMessage(activeChannelId, { body, threadRootId });
      setReplyingTo(null);
      await loadMessages(activeChannelId);
    },
    [activeChannelId, loadMessages],
  );

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      await collaborationApi.addReaction(messageId, emoji);
    },
    [],
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      if (!activeChannelId) return;
      await collaborationApi.deleteMessage(messageId);
      removeMessage(activeChannelId, messageId);
    },
    [activeChannelId, removeMessage],
  );

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeChannelId) return;
      void collaborationApi.sendTyping(activeChannelId, isTyping);
    },
    [activeChannelId],
  );

  const handleMarkRead = useCallback(() => {
    if (!activeChannelId || activeMessages.length === 0) return;
    const lastMessage = activeMessages[activeMessages.length - 1];
    void collaborationApi.markChannelRead(activeChannelId, lastMessage.id);
  }, [activeChannelId, activeMessages]);

  useEffect(() => {
    handleMarkRead();
  }, [handleMarkRead]);

  if (!canRead) {
    return (
      <div className="cd-collab-hub__denied">
        <Text as="h2" size="lg" weight="semibold">
          Collaboration Hub
        </Text>
        <Text as="p" color="secondary">
          You do not have permission to view the Collaboration Hub.
        </Text>
      </div>
    );
  }

  return (
    <div className="cd-collab-hub">
      <aside className="cd-collab-hub__sidebar">
        <Text as="h2" size="md" weight="semibold" className="cd-collab-hub__sidebar-title">
          Collaboration Hub
        </Text>
        <ChannelList
          channels={channels}
          activeChannelId={activeChannelId}
          unreadCountForChannel={unreadCountForChannel}
          onSelectChannel={setActiveChannel}
        />
      </aside>
      <div className="cd-collab-hub__main">
        <div className="cd-collab-hub__header">
          <Text as="h3" size="md" weight="semibold">
            {activeChannel?.name || (loading ? 'Loading…' : 'Select a channel')}
          </Text>
          {activeChannel?.description && (
            <Text as="p" size="xs" color="secondary">
              {activeChannel.description}
            </Text>
          )}
          <Text as="p" size="2xs" color="secondary">
            {connectionStatus.status === 'connected' ? 'Live' : connectionStatus.message || 'Connecting…'}
          </Text>
        </div>
        <MessageList
          messages={activeMessages.filter((m) => !m.threadRootId)}
          currentUserId={user?.id || null}
          onReact={handleReact}
          onDelete={handleDelete}
          onReply={setReplyingTo}
        />
        <MessageComposer
          disabled={!canPost || !activeChannelId}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSend={handleSend}
          onTypingChange={handleTyping}
        />
      </div>
    </div>
  );
}

export default CollaborationHub;
