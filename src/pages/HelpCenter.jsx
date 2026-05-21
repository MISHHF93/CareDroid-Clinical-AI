import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HelpCenter() {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);

  const faqSections = [
    {
      title: 'Getting Started',
      items: [
        {
          q: 'How do I sign up for CareDroid?',
          a: 'Click "Create Account" on the login page and follow the registration steps. You\'ll need to verify your email and set up a secure password.'
        },
        {
          q: 'What is careDroid AI?',
          a: 'CareDroid is a clinical AI assistant that provides evidence-based medical guidance, drug interaction checks, lab value interpretations, and clinical protocols to healthcare professionals.'
        },
        {
          q: 'Is my data secure?',
          a: 'Yes. All your medical data is encrypted using industry-standard AES-256 encryption. We comply with HIPAA, GDPR, and other regulations.'
        }
      ]
    },
    {
      title: 'Using Clinical Tools',
      items: [
        {
          q: 'How do I check drug interactions?',
          a: 'Use the Drug Checker tool in the toolbar. Enter medication names or generic names, and the AI will analyze interactions and contraindications.'
        },
        {
          q: 'Can I get lab value interpretations?',
          a: 'Yes, use the Lab Interpreter tool. Enter lab test names and values, and get clinical interpretation with reference ranges.'
        },
        {
          q: 'Where can I find clinical protocols?',
          a: 'Access the Protocols tool to view evidence-based clinical guidelines and treatment protocols organized by specialty.'
        }
      ]
    },
    {
      title: 'Account & Security',
      items: [
        {
          q: 'How do I enable two-factor authentication?',
          a: 'Go to Profile Settings → Security → Two-Factor Authentication. Choose SMS, email, or authenticator app verification.'
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes. Go to Profile Settings → Danger Zone → Delete Account. Note: This action is permanent and cannot be undone.'
        },
        {
          q: 'How do I change my password?',
          a: 'Visit Profile Settings → Change Password. Enter your current password and your new password.'
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
          a: 'Click "Forgot Password" on the login page. You\'ll receive a secure reset link via email.'
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
            Help Center
          </h1>
          <p style={{ color: 'var(--muted-text)' }}>
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
                  ▼
                </span>
              </button>

              {expandedSection === idx && (
                <div style={{ padding: '20px 24px', background: 'rgba(0, 255, 136, 0.05)' }}>
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
                          color: 'var(--muted-text)',
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
          background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 255, 255, 0.1))',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--accent-1)' }}>
            Need Help?
          </h2>
          <p style={{ margin: '0 0 16px 0', color: 'var(--muted-text)', fontSize: '14px' }}>
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
