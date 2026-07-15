import React, { useState, useRef, useEffect } from 'react';
import { useCopilot } from './useCopilot';
import { CopilotMessage } from '../../domain/clinical/CopilotMessage';
import { EmptyState } from '../../components/data-display/EmptyState';

export function CopilotFeature() {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { messages, sendMessage, selectedPatient } = useCopilot();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage(q, selectedPatient ? { context: { patientId: selectedPatient.id } } : undefined);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {selectedPatient && (
        <div style={{ padding: 'var(--cd-space-2) var(--cd-space-4)', borderBottom: '1px solid var(--cd-border-subtle)', fontSize: 'var(--cd-text-xs)', color: 'var(--cd-text-secondary)', background: 'var(--cd-brand-bg-subtle)' }}>
          Context: <strong style={{ color: 'var(--cd-text-primary)' }}>{selectedPatient.firstName} {selectedPatient.lastName}</strong> · {selectedPatient.chiefComplaint ?? selectedPatient.complaint}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--cd-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--cd-space-4)' }}>
        {messages.length === 0 && (
          <EmptyState title="Ask CareDroid Copilot" description="Clinical decision support powered by AI. Always verify with clinical judgment." />
        )}
        {/* eslint-disable jsx-a11y/aria-role -- CopilotMessage's `role` is a typed custom prop ('ai' | 'user'), not the DOM aria role attribute */}
        {messages.map((msg) => (
          <React.Fragment key={msg.id}>
            <CopilotMessage role="user" content={msg.query} timestamp={msg.createdAt} />
            <CopilotMessage role="ai" content={msg.response} timestamp={msg.createdAt} />
          </React.Fragment>
        ))}
        {sending && (
          <CopilotMessage role="ai" content="…" />
        )}
        {/* eslint-enable jsx-a11y/aria-role */}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ padding: 'var(--cd-space-3) var(--cd-space-4)', borderTop: '1px solid var(--cd-border-subtle)', display: 'flex', gap: 'var(--cd-space-2)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedPatient ? `Ask about ${selectedPatient.firstName}…` : 'Ask a clinical question…'}
          disabled={sending}
          style={{
            flex: 1, padding: 'var(--cd-space-2) var(--cd-space-3)',
            borderRadius: 'var(--cd-radius-lg)', border: '1px solid var(--cd-border-default)',
            fontSize: 'var(--cd-text-sm)', background: 'var(--cd-bg-base)', color: 'var(--cd-text-primary)',
            outline: 'none',
          }}
          aria-label="Copilot input"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            padding: 'var(--cd-space-2) var(--cd-space-4)',
            borderRadius: 'var(--cd-radius-lg)', border: 'none',
            background: 'var(--cd-brand-bg)', color: '#fff',
            fontSize: 'var(--cd-text-sm)', fontWeight: 'var(--cd-font-semibold)',
            cursor: 'pointer', opacity: !input.trim() || sending ? 0.5 : 1,
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
