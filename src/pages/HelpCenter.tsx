import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HelpCenter() {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<any>(null);

  const faqSections = [
    {
      title: 'Getting Started',
      items: [
        {
          q: 'How do I get started with CareDroid?',
          a: 'Open the platform entry hub or land directly in the ED demo. Use the demo persona panel to switch between reception, triage, physician, EMS, and admin views without signing in.'
        },
        {
          q: 'What is CareDroid?',
          a: 'CareDroid is a reception-first emergency department operating platform. The whiteboard, patient cards, role-based suites, and case-aware Copilot give ED teams shared operational awareness from arrival through disposition.'
        },
        {
          q: 'Is my data secure?',
          a: 'Yes. All your medical data is encrypted using industry-standard AES-256 encryption. We comply with HIPAA, GDPR, and other regulations.'
        }
      ]
    },
    {
      title: 'ED Operations',
      items: [
        {
          q: 'How do I open the emergency whiteboard?',
          a: 'Land on /emergency/whiteboard or use the Whiteboard item in the sidebar. Reception prepares patient cards first; triage, charge, and bedside teams consume the shared board state.'
        },
        {
          q: 'How does CareDroid Copilot work?',
          a: 'Open Copilot from the header or patient detail drawer. Copilot is case-aware decision support � it surfaces routing, evidence, and workflow prompts without making autonomous clinical decisions.'
        },
        {
          q: 'Where do I manage referrals and boarding?',
          a: 'Use Referrals (/emergency/referrals) for specialty coordination and Boarding (/emergency/boarding) for inpatient bed pressure. Both surfaces tie back to the whiteboard patient card.'
        }
      ]
    },
    {
      title: 'Account & Security',
      items: [
        {
          q: 'How do I enable two-factor authentication?',
          a: 'Go to Profile Settings ? Security ? Two-Factor Authentication. Choose SMS, email, or authenticator app verification.'
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes. Go to Profile Settings ? Danger Zone ? Delete Account. Note: This action is permanent and cannot be undone.'
        },
        {
          q: 'How do I change my password?',
          a: 'Visit Profile Settings ? Change Password. Enter your current password and your new password.'
        }
      ]
    },
    {
      title: 'Privacy & Compliance',
      items: [
        {
          q: 'Is CareDroid HIPAA compliant?',
          a: 'Yes. CareDroid is built with HIPAA compliance features and can sign Business Associate Agreements (BAA) for covered entities.'
        },
        {
          q: 'What personal data do you collect?',
          a: 'We collect minimal data: email, encrypted password, clinical conversations, and usage analytics. See our Privacy Policy for full details.'
        },
        {
          q: 'Can I export my conversations?',
          a: 'Yes. Go to your conversation settings to export chat history in encrypted PDF format for your records.'
        }
      ]
    },
    {
      title: 'Troubleshooting',
      items: [
        {
          q: 'I forgot my password',
          a: 'Use profile settings to review your demo identity. Password reset flows are disabled during the build phase.'
        },
        {
          q: 'The app is loading slowly',
          a: 'Clear your browser cache and cookies. Ensure you have a stable internet connection. Try a different browser if issues persist.'
        },
        {
          q: 'I\'m not receiving notifications',
          a: 'Check your notification preferences in Settings. Ensure your browser has permission to send notifications.'
        }
      ]
    }
  ];

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      overflowX: 'clip',
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
            ? Back
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
            Help Center
          </h1>
          <p style={{ color: 'var(--app-fg-muted)' }}>
            Find answers to common questions and learn how to use CareDroid
          </p>
        </div>

        {/* FAQ Sections */}
        <div style={{ display: 'grid', gap: '16px' }}>
          {faqSections.map((section, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <button
                onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: expandedSection === idx ? '1px solid var(--panel-border)' : 'none',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                  {section.title}
                </h2>
                <span style={{
                  fontSize: '20px',
                  transition: 'transform 0.2s',
                  transform: expandedSection === idx ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  ?
                </span>
              </button>

              {expandedSection === idx && (
                <div style={{ padding: '20px 24px', background: 'var(--medical-accent-tint-faint)' }}>
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {section.items.map((item, itemIdx) => (
                      <div key={itemIdx}>
                        <h3 style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--accent-1)'
                        }}>
                          Q: {item.q}
                        </h3>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          color: 'var(--app-fg-muted)',
                          lineHeight: 1.6
                        }}>
                          A: {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'linear-gradient(135deg, var(--medical-accent-tint), var(--medical-accent-tint))',
          border: '1px solid color-mix(in srgb, var(--app-accent-interactive) 30%, transparent)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--accent-1)' }}>
            Need Help?
          </h2>
          <p style={{ margin: '0 0 16px 0', color: 'var(--app-fg-muted)', fontSize: '14px' }}>
            Can't find the answer? Contact our support team:
          </p>
          <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
            <div>
              Email: <a href="mailto:support@caredroid.ai" style={{ color: 'var(--accent-1)' }}>support@caredroid.ai</a>
            </div>
            <div>
              Response time: Within 24 hours
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
