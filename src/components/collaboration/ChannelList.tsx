import { Stack } from '../layout';
import { Text, Badge } from '../primitives';
import type { CollaborationChannel } from '../../store/collaborationStore';
import './CollaborationHub.css';

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  department: 'Department',
  patient_thread: 'Patient',
  incident: 'Incident',
  direct_message: 'Direct message',
  ai_chief: 'AI Chief',
  announcement: 'Announcement',
};

type ChannelListProps = {
  channels: CollaborationChannel[];
  activeChannelId: string | null;
  unreadCountForChannel: (channelId: string) => number;
  onSelectChannel: (channelId: string) => void;
};

export function ChannelList({
  channels,
  activeChannelId,
  unreadCountForChannel,
  onSelectChannel,
}: ChannelListProps) {
  const grouped = groupByType(channels);

  return (
    <Stack gap={4} className="cd-collab-channel-list">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="cd-collab-channel-list__group">
          <Text
            as="p"
            size="xs"
            weight="semibold"
            color="secondary"
            className="cd-collab-channel-list__group-label"
          >
            {CHANNEL_TYPE_LABEL[type] || type}
          </Text>
          <Stack gap={1}>
            {items.map((channel) => {
              const unread = unreadCountForChannel(channel.id);
              const isActive = channel.id === activeChannelId;
              return (
                <button
                  key={channel.id}
                  type="button"
                  className={`cd-collab-channel-list__item${isActive ? ' cd-collab-channel-list__item--active' : ''}`}
                  onClick={() => onSelectChannel(channel.id)}
                >
                  <Text as="span" size="sm" weight={unread > 0 ? 'semibold' : 'regular'} truncate>
                    {channel.name}
                  </Text>
                  {unread > 0 && <Badge>{unread > 99 ? '99+' : unread}</Badge>}
                </button>
              );
            })}
          </Stack>
        </div>
      ))}
      {channels.length === 0 && (
        <Text as="p" size="sm" color="secondary">
          No channels yet.
        </Text>
      )}
    </Stack>
  );
}

function groupByType(channels: CollaborationChannel[]): Record<string, CollaborationChannel[]> {
  const groups: Record<string, CollaborationChannel[]> = {};
  for (const channel of channels) {
    if (channel.status !== 'active') continue;
    const list = groups[channel.type] || [];
    list.push(channel);
    groups[channel.type] = list;
  }
  return groups;
}

export default ChannelList;
