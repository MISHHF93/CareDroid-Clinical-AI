import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import {
  buildLocalCollaborationSeed,
  createLocalPatientThreadChannel,
  createLocalUserMessage,
  pickDefaultCollaborationChannel,
  type CollaborationDataSource,
} from '../../services/collaborationLocalCatalog';
import {
  isEdStaffEmergencyRole,
  resolveEdStaffCollabChannelSlug,
} from '../../config/edStaffCollaborationModel';

export function CollaborationHub() {
  const { user } = useUser();
  const { can, role, roleLabel, hospitalRole, emergency } = useSecurityAccess();
  const canRead = can(CAREDROID_PERMISSIONS.COLLABORATION_READ);
  const canPost = can(CAREDROID_PERMISSIONS.COLLABORATION_POST);
  const emergencyRole = emergency?.role || role || null;
  const profileRole = hospitalRole || emergencyRole || user?.role || null;
  const [searchParams, setSearchParams] = useSearchParams();

  const channels = useCollaborationStore((state) => state.channels);
  const activeChannelId = useCollaborationStore((state) => state.activeChannelId);
  const messagesByChannelId = useCollaborationStore((state) => state.messagesByChannelId);
  const setChannels = useCollaborationStore((state) => state.setChannels);
  const setActiveChannel = useCollaborationStore((state) => state.setActiveChannel);
  const setMessages = useCollaborationStore((state) => state.setMessages);
  const upsertMessage = useCollaborationStore((state) => state.upsertMessage);
  const upsertChannel = useCollaborationStore((state) => state.upsertChannel);
  const setMembership = useCollaborationStore((state) => state.setMembership);
  const removeMessage = useCollaborationStore((state) => state.removeMessage);
  const dispatchRealtimeEvent = useCollaborationStore((state) => state.dispatchRealtimeEvent);
  const setConnectionStatus = useCollaborationStore((state) => state.setConnectionStatus);
  const unreadCountForChannel = useCollaborationStore((state) => state.unreadCountForChannel);
  const connectionStatus = useCollaborationStore((state) => state.connectionStatus);

  const [replyingTo, setReplyingTo] = useState<CollaborationMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<CollaborationDataSource>('local-demo');
  const [statusMessage, setStatusMessage] = useState('');

  const preferredSlug =
    searchParams.get('channel') ||
    (isEdStaffEmergencyRole(emergencyRole) ? resolveEdStaffCollabChannelSlug(emergencyRole) : null);
  const patientIdParam = searchParams.get('patientId');

  const applyLocalSeed = useCallback(() => {
    const seed = buildLocalCollaborationSeed({
      role: emergencyRole || profileRole,
      userId: user?.id || 'local-user',
      preferredChannelSlug: preferredSlug,
    });
    setChannels(seed.entries);
    for (const [channelId, messages] of Object.entries(seed.messagesByChannelId)) {
      setMessages(channelId, messages);
    }
    if (seed.preferredChannelId) {
      setActiveChannel(seed.preferredChannelId);
    }
    setDataSource('local-demo');
    setConnectionStatus({
      status: 'reconnecting',
      mode: 'polling',
      message: 'Desk demo mode — sign in for live team channels.',
      updatedAt: new Date().toISOString(),
    });
    setStatusMessage('Showing desk demo channels for your profile. Sign in for live collaboration.');
    return seed;
  }, [
    emergencyRole,
    preferredSlug,
    profileRole,
    setActiveChannel,
    setChannels,
    setConnectionStatus,
    setMessages,
    user?.id,
  ]);

  const loadChannels = useCallback(async () => {
    if (!collaborationApi.hasCollaborationLiveAuth()) {
      applyLocalSeed();
      return;
    }

    const result = await collaborationApi.fetchChannels();
    if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
      setChannels(result.data);
      setDataSource('live');
      setStatusMessage('');
      const list = result.data.map((entry) => entry.channel);
      const nextId =
        pickDefaultCollaborationChannel(list, emergencyRole || profileRole, preferredSlug) ||
        (!activeChannelId ? list[0]?.id : null);
      if (nextId) setActiveChannel(nextId);
      setConnectionStatus({
        status: 'connected',
        mode: 'sse',
        message: 'Live collaboration',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    // Empty live list or error → still give reception a usable desk
    applyLocalSeed();
    if (result.message) {
      setStatusMessage(result.message);
    } else if (result.ok) {
      setStatusMessage('No live channels yet — desk demo channels loaded for your role.');
    }
  }, [
    activeChannelId,
    applyLocalSeed,
    emergencyRole,
    preferredSlug,
    profileRole,
    setActiveChannel,
    setChannels,
    setConnectionStatus,
  ]);

  const loadMessages = useCallback(
    async (channelId: string) => {
      if (dataSource === 'local-demo' || channelId.startsWith('local-')) {
        // Local seed already populated messages; keep whatever is in the store.
        return;
      }
      const result = await collaborationApi.fetchMessages(channelId, { limit: 100 });
      if (result.ok && Array.isArray(result.data)) {
        setMessages(channelId, result.data);
      }
    },
    [dataSource, setMessages],
  );

  useEffect(() => {
    if (!canRead) return;
    void loadChannels().finally(() => setLoading(false));
  }, [canRead, loadChannels]);

  useEffect(() => {
    if (!canRead || !activeChannelId) return;
    void loadMessages(activeChannelId);
  }, [activeChannelId, canRead, loadMessages]);

  // Patient deep-link from reception (local or live)
  useEffect(() => {
    if (!canRead || !patientIdParam) return;

    const openPatientThread = async () => {
      if (dataSource === 'live' && collaborationApi.hasCollaborationLiveAuth()) {
        const result = await collaborationApi.fetchPatientThread(patientIdParam);
        if (result.ok && result.data) {
          const payload = result.data as any;
          const channel = payload.channel || payload;
          if (channel?.id) {
            upsertChannel(channel);
            setActiveChannel(channel.id);
            if (Array.isArray(payload.messages)) setMessages(channel.id, payload.messages);
            return;
          }
        }
      }

      const local = createLocalPatientThreadChannel({
        patientId: patientIdParam,
        patientLabel: searchParams.get('patientName') || undefined,
        userId: user?.id,
      });
      upsertChannel(local.channel);
      setMembership(local.membership);
      setMessages(local.channel.id, local.messages);
      setActiveChannel(local.channel.id);
    };

    void openPatientThread();
  }, [
    canRead,
    dataSource,
    patientIdParam,
    searchParams,
    setActiveChannel,
    setMembership,
    setMessages,
    upsertChannel,
    user?.id,
  ]);

  useEffect(() => {
    if (!canRead || dataSource !== 'live' || !collaborationApi.hasCollaborationLiveAuth()) {
      return () => {};
    }
    const stop = startCollaborationRealtime({
      onEvent: dispatchRealtimeEvent,
      onStatus: setConnectionStatus,
      onPoll: async () => {
        await loadChannels();
        if (activeChannelId) await loadMessages(activeChannelId);
      },
    });
    return stop;
  }, [
    activeChannelId,
    canRead,
    dataSource,
    dispatchRealtimeEvent,
    loadChannels,
    loadMessages,
    setConnectionStatus,
  ]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) || null,
    [channels, activeChannelId],
  );
  const activeMessages = activeChannelId ? messagesByChannelId[activeChannelId] || [] : [];

  const handleSend = useCallback(
    async (body: string, threadRootId?: string) => {
      if (!activeChannelId || !body.trim()) return;

      if (dataSource === 'local-demo' || activeChannelId.startsWith('local-')) {
        const message = createLocalUserMessage({
          channelId: activeChannelId,
          body: body.trim(),
          senderId: user?.id || 'local-user',
          threadRootId,
        });
        upsertMessage(message);
        setReplyingTo(null);
        return;
      }

      await collaborationApi.postMessage(activeChannelId, { body, threadRootId });
      setReplyingTo(null);
      await loadMessages(activeChannelId);
    },
    [activeChannelId, dataSource, loadMessages, upsertMessage, user?.id],
  );

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (dataSource === 'local-demo') return;
      await collaborationApi.addReaction(messageId, emoji);
    },
    [dataSource],
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      if (!activeChannelId) return;
      if (dataSource === 'local-demo' || activeChannelId.startsWith('local-')) {
        removeMessage(activeChannelId, messageId);
        return;
      }
      await collaborationApi.deleteMessage(messageId);
      removeMessage(activeChannelId, messageId);
    },
    [activeChannelId, dataSource, removeMessage],
  );

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeChannelId || dataSource === 'local-demo') return;
      void collaborationApi.sendTyping(activeChannelId, isTyping);
    },
    [activeChannelId, dataSource],
  );

  const handleMarkRead = useCallback(() => {
    if (!activeChannelId || activeMessages.length === 0) return;
    const lastMessage = activeMessages[activeMessages.length - 1];
    if (dataSource === 'local-demo' || activeChannelId.startsWith('local-')) return;
    void collaborationApi.markChannelRead(activeChannelId, lastMessage.id);
  }, [activeChannelId, activeMessages, dataSource]);

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

  const sourceLabel = dataSource === 'live' ? 'Live' : 'Desk demo';
  const profileLabel = roleLabel || profileRole || 'ED staff';
  const edStaffLane = isEdStaffEmergencyRole(emergencyRole);

  return (
    <div className="cd-collab-hub">
      <aside className="cd-collab-hub__sidebar">
        <Text as="h2" size="md" weight="semibold" className="cd-collab-hub__sidebar-title">
          Collaboration Hub
        </Text>
        <p className="cd-collab-hub__profile-chip">
          {profileLabel}
          {edStaffLane ? (
            <span className="cd-collab-hub__source cd-collab-hub__source--ed-staff">ED staff</span>
          ) : null}
          <span className={`cd-collab-hub__source cd-collab-hub__source--${dataSource}`}>
            {sourceLabel}
          </span>
        </p>
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
          {activeChannel?.description ? (
            <Text as="p" size="xs" color="secondary">
              {activeChannel.description}
            </Text>
          ) : null}
          <Text as="p" size="2xs" color="secondary">
            {dataSource === 'live'
              ? connectionStatus.status === 'connected'
                ? 'Live'
                : connectionStatus.message || 'Connecting…'
              : connectionStatus.message || 'Desk demo mode'}
          </Text>
          {statusMessage ? (
            <p className="cd-collab-hub__status-banner" role="status">
              {statusMessage}
              {dataSource === 'local-demo' && preferredSlug ? (
                <button
                  type="button"
                  className="cd-collab-hub__status-clear"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('channel');
                    setSearchParams(next, { replace: true });
                  }}
                >
                  Clear filter
                </button>
              ) : null}
            </p>
          ) : null}
        </div>
        {loading && !activeChannelId ? (
          <Text as="p" size="sm" color="secondary" className="cd-collab-hub__loading-state">
            Loading channels…
          </Text>
        ) : !activeChannelId ? (
          <Text as="p" size="sm" color="secondary" className="cd-collab-hub__loading-state">
            Select a channel to view messages.
          </Text>
        ) : (
          <MessageList
            messages={activeMessages.filter((m) => !m.threadRootId)}
            currentUserId={user?.id || null}
            onReact={handleReact}
            onDelete={handleDelete}
            onReply={setReplyingTo}
          />
        )}
        <MessageComposer
          disabled={!canPost || !activeChannelId}
          disabledReason={
            !activeChannelId
              ? 'Select a channel to start messaging.'
              : !canPost
                ? 'You do not have permission to post in this channel.'
                : undefined
          }
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
