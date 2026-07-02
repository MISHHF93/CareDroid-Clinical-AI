import React from 'react';
import { getInventoryItem } from '../data/featureInventory';
import { NavIcon } from '../navigation/NavIcon';
import { getFeatureIcon } from '../navigation/iconRegistry';

const ToolPanel = ({ tool, feature }) => {
  const selectedId = feature || tool;
  if (!selectedId) return null;

  const item = getInventoryItem(selectedId);

  return (
    <div style={{
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: '900px',
      width: 'calc(100% - 40px)',
      background: 'var(--medical-accent-tint)',
      border: '1px solid color-mix(in srgb, var(--app-accent-interactive) 30%, transparent)',
      borderRadius: '12px',
      padding: '20px',
      color: 'var(--text-color)'
    }}>
      {!item && <div>Tool information not available</div>}
      {item && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-color)' }} aria-hidden>
              <NavIcon icon={getFeatureIcon(item.id)} size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {item.name}
            </h3>
            <div style={{
              marginLeft: 'auto',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              {item.category}
            </div>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
            {item.description}
          </p>
          {item.highlights && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '12px' }}>
              {item.highlights.map((highlight) => (
                <div
                  key={highlight.title}
                  style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{highlight.title}</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{highlight.subtitle}</div>
                </div>
              ))}
            </div>
          )}
          {item.prompt && (
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Try asking: <span style={{ color: '#00FF88' }}>{item.prompt}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolPanel;
