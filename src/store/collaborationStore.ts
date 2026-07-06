import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CollaborationChannelType =
  | 'department'
  | 'patient_thread'
  | 'incident'
  | 'direct_message'
  | 'ai_chief'
  | 'announcement';

export type CollaborationChannel = {
  id: string;
  organizationId: string;
  type: CollaborationChannelType;
  name: string;
  description?: string | null;
  departmentKey?: string | null;
  patientId?: string | null;
  status: 'active' | 'archived';
  isSystemManaged: boolean;
  incidentSeverity?: string | null;
  createdAt: string;
};

export type CollaborationMembership = {
  channelId: string;
  userId: string;
  role: 'owner' | 'moderator' | 'member';
  notificationPreference: 'all' | 'mentions' | 'none';
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
};

export type CollaborationMessage = {
  id: string;
  channelId: string;
  threadRootId?: string | null;
  senderId?: string | null;
  senderType: 'user' | 'system' | 'ai_chief';
  body: string;
  mentionedUserIds?: string[] | null;
  pinnedAt?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
};

type ConnectionStatus = {
  status: 'connected' | 'reconnecting' | 'unknown';
  mode: 'sse' | 'polling' | 'unknown';
  message: string;
  updatedAt: string;
};

type CollaborationStoreState = Readonly<{
  channels: CollaborationChannel[];
  membershipsByChannelId: Record<string, CollaborationMembership>;
  messagesByChannelId: Record<string, CollaborationMessage[]>;
  activeChannelId: string | null;
  typingByChannelId: Record<string, Record<string, number>>;
  connectionStatus: ConnectionStatus;
  lastSyncedAt: string | null;

  setChannels: (entries: Array<{ channel: CollaborationChannel; membership?: CollaborationMembership }>) => void;
  upsertChannel: (channel: CollaborationChannel) => void;
  setActiveChannel: (channelId: string | null) => void;
  setMessages: (channelId: string, messages: CollaborationMessage[]) => void;
  upsertMessage: (message: CollaborationMessage) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setMembership: (membership: CollaborationMembership) => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  dispatchRealtimeEvent: (event: { type: string; payload?: any }) => void;
  unreadCountForChannel: (channelId: string) => number;
}>;

function upsertInArray<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = { ...next[index], ...item };
  return next;
}

export const useCollaborationStore = create<CollaborationStoreState>()(
  persist(
    (set, get) => ({
      channels: [],
      membershipsByChannelId: {},
      messagesByChannelId: {},
      activeChannelId: null,
      typingByChannelId: {},
      connectionStatus: { status: 'unknown', mode: 'unknown', message: '', updatedAt: new Date().toISOString() },
      lastSyncedAt: null,

      setChannels: (entries) =>
        set(() => {
          const channels = entries.map((entry) => entry.channel);
          const membershipsByChannelId: Record<string, CollaborationMembership> = {};
          for (const entry of entries) {
            if (entry.membership) membershipsByChannelId[entry.channel.id] = entry.membership;
          }
          return { channels, membershipsByChannelId, lastSyncedAt: new Date().toISOString() };
        }),

      upsertChannel: (channel) => set((state) => ({ channels: upsertInArray(state.channels, channel) })),

      setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

      setMessages: (channelId, messages) =>
        set((state) => ({ messagesByChannelId: { ...state.messagesByChannelId, [channelId]: messages } })),

      upsertMessage: (message) =>
        set((state) => {
          const existing = state.messagesByChannelId[message.channelId] || [];
          return {
            messagesByChannelId: {
              ...state.messagesByChannelId,
              [message.channelId]: upsertInArray(existing, message),
            },
          };
        }),

      removeMessage: (channelId, messageId) =>
        set((state) => ({
          messagesByChannelId: {
            ...state.messagesByChannelId,
            [channelId]: (state.messagesByChannelId[channelId] || []).filter((m) => m.id !== messageId),
          },
        })),

      setMembership: (membership) =>
        set((state) => ({
          membershipsByChannelId: { ...state.membershipsByChannelId, [membership.channelId]: membership },
        })),

      setTyping: (channelId, userId, isTyping) =>
        set((state) => {
          const channelTyping = { ...(state.typingByChannelId[channelId] || {}) };
          if (isTyping) {
            channelTyping[userId] = Date.now();
          } else {
            delete channelTyping[userId];
          }
          return { typingByChannelId: { ...state.typingByChannelId, [channelId]: channelTyping } };
        }),

      setConnectionStatus: (status) => set({ connectionStatus: status }),

      dispatchRealtimeEvent: (event) => {
        const payload = event.payload || {};
        switch (event.type) {
          case 'message_created':
          case 'message_updated':
            if (payload.message) get().upsertMessage(payload.message);
            break;
          case 'message_deleted':
            if (payload.channelId && payload.messageId) get().removeMessage(payload.channelId, payload.messageId);
            break;
          case 'reaction_added':
          case 'reaction_removed':
          case 'message_pinned':
          case 'message_unpinned':
          case 'attachment_added':
            // Simplest correct behavior: refetch the affected message list from the
            // page/hook driving this store rather than patch reaction/pin state here.
            break;
          case 'typing':
            if (payload.channelId && payload.userId != null) {
              get().setTyping(payload.channelId, String(payload.userId), Boolean(payload.isTyping));
            }
            break;
          default:
            break;
        }
      },

      unreadCountForChannel: (channelId) => {
        const messages = get().messagesByChannelId[channelId] || [];
        const membership = get().membershipsByChannelId[channelId];
        if (!membership?.lastReadAt) return messages.length;
        const lastReadAt = new Date(membership.lastReadAt).getTime();
        return messages.filter((m) => new Date(m.createdAt).getTime() > lastReadAt).length;
      },
    }),
    {
      name: 'caredroid-collaboration',
      partialize: (state) => ({
        channels: state.channels,
        membershipsByChannelId: state.membershipsByChannelId,
        activeChannelId: state.activeChannelId,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);

export function getCollaborationStoreState() {
  return useCollaborationStore.getState();
}
