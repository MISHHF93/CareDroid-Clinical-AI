import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import React from 'react';
import { EMPTY_STATE_COPY } from '../config/emptyStateCopy';

/**
 * CitationBadge Component
 * 
 * Displays a clickable citation badge with source details.
 */
const CitationBadge = ({ citation, index, onClick }) => {
  return (
    <button type="button"
      onClick={() => onClick(citation)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        margin: '2px',
        borderRadius: '12px',
        border: '1px solid rgba(0, 180, 255, 0.4)',
        background: 'rgba(0, 180, 255, 0.1)',
        color: '#00B4FF',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 180, 255, 0.2)';
        e.currentTarget.style.borderColor = 'rgba(0, 180, 255, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0, 180, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(0, 180, 255, 0.4)';
      }}
    >
      <span>[{index + 1}]</span>
      <span>{citation.title.length > 30 ? citation.title.substring(0, 30) + '...' : citation.title}</span>
    </button>
  );
};

/**
 * Citations Component
 * 
 * Displays a list of citations with badges and optional detail modal.
 */
const Citations = ({ citations, onViewDetails }) => {
  if (!citations || citations.length === 0) {
    return (
      <p style={{ marginTop: 12, fontSize: 12, color: MEDICAL_THEME.inkSubtle }} role="status">
        {EMPTY_STATE_COPY.clinical.noCitations.guidance}
      </p>
    );
  }

  return (
    <div style={{
      marginTop: '16px',
      padding: '12px 16px',
      borderRadius: '10px',
      background: 'rgba(0, 180, 255, 0.05)',
      border: '1px solid rgba(0, 180, 255, 0.2)',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.7)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '8px',
      }}>
        📚 Sources ({citations.length})
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
      }}>
        {citations.map((citation, index) => (
          <CitationBadge
            key={index}
            citation={citation}
            index={index}
            onClick={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * CitationModal Component
 * 
 * Modal displaying detailed information about a medical source.
 */
export const CitationModal = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- click-outside-to-dismiss backdrop; the real Close button below is the keyboard-accessible dismiss control
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- onClick only stops propagation to the backdrop's close handler, it is not an interactive control itself */}
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--panel-border)',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div className="u-flex-1">
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-color)',
              lineHeight: '1.4',
            }}>
              {citation.title}
            </h3>
            {citation.organization && (
              <div style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
              }}>
                {citation.organization}
              </div>
            )}
          </div>
          <button type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'var(--app-on-solid)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Type Badge */}
          <div className="u-mb-16-str">
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: citation.type === 'protocol' ? 'rgba(255, 184, 0, 0.15)' :
                          citation.type === 'guideline' ? 'var(--medical-accent-tint-strong)' :
                          citation.type === 'drug_info' ? 'rgba(0, 180, 255, 0.15)' :
                          'rgba(255, 255, 255, 0.1)',
              color: citation.type === 'protocol' ? '#FFB800' :
                     citation.type === 'guideline' ? '#00FF88' :
                     citation.type === 'drug_info' ? '#00B4FF' :
                     'rgba(255, 255, 255, 0.8)',
              border: `1px solid ${citation.type === 'protocol' ? 'rgba(255, 184, 0, 0.3)' :
                                    citation.type === 'guideline' ? 'color-mix(in srgb, var(--app-accent-interactive) 30%, transparent)' :
                                    citation.type === 'drug_info' ? 'rgba(0, 180, 255, 0.3)' :
                                    'rgba(255, 255, 255, 0.2)'}`,
            }}>
              {citation.type.replace('_', ' ')}
            </span>
            {citation.evidenceLevel && (
              <span style={{
                display: 'inline-block',
                marginLeft: '8px',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--medical-accent-tint-strong)',
                color: '#00FF88',
                border: '1px solid color-mix(in srgb, var(--app-accent-interactive) 30%, transparent)',
              }}>
                Evidence Level: {citation.evidenceLevel}
              </span>
            )}
          </div>

          {/* Description */}
          {citation.description && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.8)',
            }}>
              {citation.description}
            </div>
          )}

          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}>
            {citation.authors && citation.authors.length > 0 && (
              <div>
                <div className="u-label-caps">
                  Authors
                </div>
                <div className="u-muted-13">
                  {citation.authors.join(', ')}
                </div>
              </div>
            )}

            {citation.date && (
              <div>
                <div className="u-label-caps">
                  Date
                </div>
                <div className="u-muted-13">
                  {citation.date}
                </div>
              </div>
            )}

            {citation.specialty && (
              <div>
                <div className="u-label-caps">
                  Specialty
                </div>
                <div className="u-muted-13">
                  {citation.specialty}
                </div>
              </div>
            )}

            {citation.doi && (
              <div>
                <div className="u-label-caps">
                  DOI
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#00B4FF',
                  wordBreak: 'break-all',
                }}>
                  {citation.doi}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {citation.tags && citation.tags.length > 0 && (
            <div className="u-mb-16-str">
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {citation.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* URL */}
          {citation.url && (
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                Source Link
              </div>
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: 'rgba(0, 180, 255, 0.1)',
                  border: '1px solid rgba(0, 180, 255, 0.3)',
                  color: '#00B4FF',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  wordBreak: 'break-all',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 180, 255, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(0, 180, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 180, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0, 180, 255, 0.3)';
                }}
              >
                <span>🔗</span>
                <span>View Full Source</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Citations;
