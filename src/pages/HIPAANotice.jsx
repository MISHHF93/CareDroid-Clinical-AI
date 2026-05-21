import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HIPAANotice() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'var(--navy-bg)',
      color: 'var(--text-color)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--panel-border)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            ← Back
          </button>
          
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '12px',
            background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            HIPAA Compliance & Addendum
          </h1>
          <p style={{ color: 'var(--muted-text)' }}>
            Health Insurance Portability and Accountability Act (HIPAA) compliance information
          </p>
        </div>

        {/* Content */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--panel-border)',
          borderRadius: '12px',
          padding: '32px',
          lineHeight: '1.8'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              1. Protected Health Information (PHI)
            </h2>
            <p style={{ color: 'var(--muted-text)', marginBottom: '8px' }}>
              CareDroid is designed to handle Protected Health Information (PHI) in compliance with HIPAA regulations. All medical records, clinical documentation, and patient identifiers are encrypted and secured.
            </p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              2. Privacy Safeguards
            </h2>
            <p style={{ color: 'var(--muted-text)', marginBottom: '8px' }}>
              We implement the following HIPAA Privacy Rule safeguards:
            </p>
            <ul style={{ color: 'var(--muted-text)', paddingLeft: '20px' }}>
              <li>Administrative safeguards: Policies and procedures for access controls</li>
              <li>Physical safeguards: Facility and equipment access controls</li>
              <li>Technical safeguards: Encryption, authentication, audit controls</li>
              <li>Transmission security: Encrypted communications</li>
            </ul>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              3. Breach Notification
            </h2>
            <p style={{ color: 'var(--muted-text)' }}>
              In the unlikely event of a breach of unsecured PHI, we will notify affected individuals, HHS, and if applicable, the media, without unreasonable delay but no later than 60 calendar days after discovery.
            </p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              4. Patient Rights
            </h2>
            <p style={{ color: 'var(--muted-text)', marginBottom: '8px' }}>
              You have the right to:
            </p>
            <ul style={{ color: 'var(--muted-text)', paddingLeft: '20px' }}>
              <li>Request access to your PHI</li>
              <li>Receive an accounting of disclosures</li>
              <li>Request amendment of your records</li>
              <li>Request restrictions on use and disclosure</li>
              <li>Request confidential communications</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '32px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-1)' }}>HIPAA Privacy Officer</h3>
            <p style={{ margin: '0', color: 'var(--muted-text)', fontSize: '14px' }}>
              For HIPAA-related inquiries: <a href="mailto:hipaa@caredroid.ai" style={{ color: 'var(--accent-1)' }}>hipaa@caredroid.ai</a>
            </p>
          </div>

          <p style={{ color: 'var(--muted-text)', fontSize: '13px' }}>
            Last Updated: February 2026 | CareDroid maintains full HIPAA compliance and can execute Business Associate Agreements (BAA) upon request
          </p>
        </div>
      </div>
    </div>
  );
}
