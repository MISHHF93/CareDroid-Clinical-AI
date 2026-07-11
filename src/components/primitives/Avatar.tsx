import React, { useState } from 'react';
import './Avatar.css';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_COLORS = [
  'hsl(200 98% 35%)', 'hsl(142 72% 29%)', 'hsl(250 76% 52%)',
  'hsl(21 90% 45%)',  'hsl(0 72% 42%)',   'hsl(38 92% 38%)',
  'hsl(215 25% 40%)', 'hsl(199 89% 40%)',
];

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type AvatarProps = {
  src?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function Avatar({ src, name = '', size = 'md', className, ...props }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = src && !imgFailed;
  const initials = getInitials(name);
  const bg = getColor(name || 'default');

  const classNames = ['cd-avatar', `cd-avatar--${size}`, className ?? ''].filter(Boolean).join(' ');
  const content = showImage ? (
    <img
      className="cd-avatar__img"
      src={src}
      alt={name || ''}
      onError={() => setImgFailed(true)}
    />
  ) : (
    <span className="cd-avatar__initials" aria-hidden="true">{initials || '?'}</span>
  );

  // Static role only when named (Edge Tools rejects dynamic ARIA roles).
  if (name) {
    return (
      <span
        className={classNames}
        style={!showImage ? { background: bg } : undefined}
        aria-label={name}
        role="img"
        {...props}
      >
        {content}
      </span>
    );
  }
  return (
    <span
      className={classNames}
      style={!showImage ? { background: bg } : undefined}
      {...props}
    >
      {content}
    </span>
  );
}
