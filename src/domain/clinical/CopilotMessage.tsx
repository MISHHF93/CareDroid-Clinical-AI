import React from 'react';
import { Avatar } from '../../components/primitives/Avatar';
import './clinical.css';

type CopilotMessageProps = {
  role: 'ai' | 'user';
  content: string;
  timestamp?: string;
  userName?: string;
  className?: string;
};

function fmtTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CopilotMessage({ role, content, timestamp, userName = 'You', className }: CopilotMessageProps) {
  return (
    <div className={['cd-copilot-msg', `cd-copilot-msg--${role}`, className ?? ''].filter(Boolean).join(' ')}>
      <div className="cd-copilot-msg__avatar">
        <Avatar
          name={role === 'ai' ? 'AI' : userName}
          size="sm"
          aria-hidden
        />
      </div>
      <div>
        <div className="cd-copilot-msg__bubble">{content}</div>
        {timestamp && <div className="cd-copilot-msg__time">{fmtTime(timestamp)}</div>}
      </div>
    </div>
  );
}
