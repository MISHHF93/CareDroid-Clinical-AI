import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GDPRNotice() {
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
            GDPR Notice
          </h1>
          <p style={{ color: 'var(--muted-text)' }}>
            General Data Protection Regulation (GDPR) compliance information for EU residents
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
              1. Data Protection Rights
            </h2>
            <p style={{ color: 'var(--muted-text)', marginBottom: '8px' }}>
              Under GDPR, you have the right to:
            </p>
            <ul style={{ color: 'var(--muted-text)', paddingLeft: '20px' }}>
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion (Right to be Forgotten)</li>
              <li>Restrict data processing</li>
              <li>Data portability</li>
              <li>Object to processing</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              2. Data Processing
            </h2>
            <p style={{ color: 'var(--muted-text)' }}>
              We process personal data only with your explicit consent. Your medical and clinical data is encrypted and stored securely according to GDPR Article 32 requirements.
            </p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              3. Data Retention
            </h2>
            <p style={{ color: 'var(--muted-text)' }}>
              Your data is retained only as long as necessary for the purposes stated. You can request deletion at any time, and we will comply within 30 days unless legal obligations require retention.
            </p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              4. International Transfers
            </h2>
            <p style={{ color: 'var(--muted-text)' }}>
              If your data is transferred outside the EU/EEA, we ensure adequate safeguards are in place as per GDPR Chapter 5.
            </p>
          </div>

          <div style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '32px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-1)' }}>Contact Our Data Protection Officer</h3>
            <p style={{ margin: '0', color: 'var(--muted-text)', fontSize: '14px' }}>
              For GDPR-related inquiries: <a href="mailto:dpo@caredroid.ai" style={{ color: 'var(--accent-1)' }}>dpo@caredroid.ai</a>
            </p>
          </div>

          <p style={{ color: 'var(--muted-text)', fontSize: '13px' }}>
            Last Updated: February 2026 | For full GDPR information, see our Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
