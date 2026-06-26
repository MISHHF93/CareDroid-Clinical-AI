import './LegalPage.css';

/**
 * Privacy Policy Page
 * 
 * HIPAA-compliant privacy policy
 * REQUIRED for app store submission
 */
export const PrivacyPolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-header">
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last Updated: January 31, 2026</p>
        <p className="legal-intro">
          CareDroid is committed to protecting your privacy and complying with all applicable 
          healthcare privacy regulations, including HIPAA (Health Insurance Portability and 
          Accountability Act).
        </p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Information We Collect</h2>
          
          <h3>1.1 Protected Health Information (PHI)</h3>
          <p>
            When you use CareDroid for clinical decision support, we may collect and process 
            Protected Health Information, including:
          </p>
          <ul>
            <li>Patient identifiers (as provided by you in queries)</li>
            <li>Medical history and clinical data</li>
            <li>Laboratory results and test data</li>
            <li>Diagnostic information</li>
            <li>Treatment plans and recommendations</li>
          </ul>
          
          <h3>1.2 Account Information</h3>
          <ul>
            <li>Name and email address</li>
            <li>Professional credentials and role (Student, Nurse, Physician, Administrator)</li>
            <li>Organization/facility affiliation</li>
            <li>Authentication credentials (encrypted)</li>
          </ul>
          
          <h3>1.3 Usage Data</h3>
          <ul>
            <li>Conversation history and queries</li>
            <li>Tool usage patterns</li>
            <li>System interaction logs</li>
            <li>Device and browser information</li>
            <li>IP address and location data</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Your Information</h2>
          <p>We use your information for the following purposes:</p>
          <ul>
            <li><strong>Clinical Decision Support:</strong> Process your queries and provide evidence-based recommendations</li>
            <li><strong>Service Improvement:</strong> Analyze usage patterns to improve AI model accuracy</li>
            <li><strong>Security:</strong> Monitor for suspicious activity and prevent unauthorized access</li>
            <li><strong>Compliance:</strong> Maintain audit logs as required by HIPAA</li>
            <li><strong>Communication:</strong> Send critical alerts, system updates, and support messages</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. HIPAA Compliance</h2>
          
          <h3>3.1 Business Associate Agreement</h3>
          <p>
            CareDroid acts as a Business Associate under HIPAA. Healthcare organizations using 
            CareDroid must execute a Business Associate Agreement (BAA) with us.
          </p>
          
          <h3>3.2 Minimum Necessary Standard</h3>
          <p>
            We adhere to the HIPAA minimum necessary standard, collecting and using only the 
            information required to provide clinical decision support services.
          </p>
          
          <h3>3.3 Safeguards</h3>
          <p>We implement administrative, physical, and technical safeguards including:</p>
          <ul>
            <li>End-to-end encryption of PHI in transit and at rest (AES-256)</li>
            <li>Role-based access control (RBAC) with 22 granular permissions</li>
            <li>Multi-factor authentication (2FA/MFA)</li>
            <li>Comprehensive audit logging of all PHI access</li>
            <li>Regular security audits and penetration testing</li>
            <li>Employee training on HIPAA compliance</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Data Storage and Retention</h2>
          
          <h3>4.1 Storage Location</h3>
          <p>
            All data is stored in HIPAA-compliant data centers within the United States. 
            We do not transfer PHI outside the U.S. without explicit consent.
          </p>
          
          <h3>4.2 Retention Period</h3>
          <ul>
            <li><strong>Conversation History:</strong> Retained for 7 years (as required by HIPAA)</li>
            <li><strong>Audit Logs:</strong> Retained for 6 years from creation date</li>
            <li><strong>Account Data:</strong> Retained until account deletion + 30 days</li>
            <li><strong>Anonymized Analytics:</strong> Retained indefinitely</li>
          </ul>
          
          <h3>4.3 Data Deletion</h3>
          <p>
            You may request deletion of your data at any time. PHI will be deleted within 30 days, 
            except where retention is required by law or for audit purposes.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data Sharing and Disclosure</h2>
          
          <h3>5.1 No Sale of Data</h3>
          <p className="legal-highlight">
            We DO NOT sell, rent, or trade your PHI or personal information to third parties.
          </p>
          
          <h3>5.2 Permitted Disclosures</h3>
          <p>We may disclose PHI only in the following limited circumstances:</p>
          <ul>
            <li><strong>With Your Consent:</strong> When you explicitly authorize disclosure</li>
            <li><strong>To Your Organization:</strong> Sharing with authorized users in your healthcare facility</li>
            <li><strong>To Service Providers:</strong> HIPAA-compliant vendors under BAAs (e.g., cloud hosting, encryption services)</li>
            <li><strong>As Required by Law:</strong> Court orders, subpoenas, or regulatory investigations</li>
            <li><strong>Emergency Situations:</strong> To prevent imminent harm to patient or public health</li>
          </ul>
          
          <h3>5.3 Third-Party Services</h3>
          <p>We use the following HIPAA-compliant third-party services:</p>
          <ul>
            <li>AWS (Amazon Web Services) - Cloud infrastructure</li>
            <li>Pinecone - Vector database for RAG (with BAA)</li>
            <li>OpenAI/Anthropic - LLM APIs (with BAAs and zero data retention agreements)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Your Rights</h2>
          <p>Under HIPAA and applicable privacy laws, you have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your PHI we have collected</li>
            <li><strong>Amendment:</strong> Request corrections to inaccurate PHI</li>
            <li><strong>Accounting:</strong> Request a list of PHI disclosures</li>
            <li><strong>Restriction:</strong> Request limits on use and disclosure of PHI</li>
            <li><strong>Confidential Communication:</strong> Request communications via specific methods</li>
            <li><strong>Breach Notification:</strong> Be notified of any PHI breaches</li>
            <li><strong>Revoke Consent:</strong> Withdraw consent for PHI processing</li>
            <li><strong>Export Data:</strong> Download your data in machine-readable format</li>
            <li><strong>Delete Account:</strong> Permanently delete your account and associated data</li>
          </ul>
          
          <p>To exercise these rights, contact us at: <a href="mailto:privacy@caredroid.ai">privacy@caredroid.ai</a></p>
        </section>

        <section className="legal-section">
          <h2>7. Security Measures</h2>
          <ul>
            <li><strong>Encryption:</strong> AES-256 encryption at rest, TLS 1.3 in transit</li>
            <li><strong>Authentication:</strong> Multi-factor authentication (2FA) required for all users</li>
            <li><strong>Access Control:</strong> Role-based permissions with principle of least privilege</li>
            <li><strong>Audit Logging:</strong> Comprehensive logs of all PHI access (immutable)</li>
            <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
            <li><strong>Incident Response:</strong> Documented breach notification procedures</li>
            <li><strong>Employee Training:</strong> Annual HIPAA and security training</li>
            <li><strong>Vulnerability Management:</strong> Regular security scans and penetration testing</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Data Breach Notification</h2>
          <p>
            In the event of a security breach involving PHI, we will:
          </p>
          <ul>
            <li>Notify affected individuals within 60 days of discovery</li>
            <li>Report to the Department of Health and Human Services (HHS) as required</li>
            <li>Notify partnered healthcare organizations</li>
            <li>Take immediate steps to mitigate harm and prevent future breaches</li>
            <li>Provide credit monitoring services if applicable</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>9. Children's Privacy</h2>
          <p>
            CareDroid is not intended for use by individuals under 18 years of age without 
            supervision. We do not knowingly collect PHI from minors without parental consent.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. International Users</h2>
          <p>
            CareDroid is designed for use in the United States and complies with U.S. healthcare 
            privacy laws. If you access CareDroid from outside the U.S., your data will be 
            transferred to and processed in the United States.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy to reflect changes in our practices or legal 
            requirements. We will notify you of material changes by:
          </p>
          <ul>
            <li>Email notification to your registered address</li>
            <li>In-app notification banner</li>
            <li>Updating the "Last Updated" date</li>
          </ul>
          <p>
            Continued use of CareDroid after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Contact Information</h2>
          <div className="contact-info">
            <p><strong>Privacy Officer:</strong></p>
            <p>CareDroid, Inc.</p>
            <p>Email: <a href="mailto:privacy@caredroid.ai">privacy@caredroid.ai</a></p>
            <p>Phone: 1-800-CAREDROID</p>
            <p>Address: [Company Address]</p>
          </div>
          
          <div className="contact-info">
            <p><strong>HIPAA Compliance Questions:</strong></p>
            <p>Email: <a href="mailto:hipaa@caredroid.ai">hipaa@caredroid.ai</a></p>
          </div>
          
          <div className="contact-info">
            <p><strong>Data Subject Requests:</strong></p>
            <p>Email: <a href="mailto:dsr@caredroid.ai">dsr@caredroid.ai</a></p>
          </div>
        </section>

        <section className="legal-section legal-footer-section">
          <p className="legal-acknowledgment">
            By using CareDroid, you acknowledge that you have read, understood, and agree to 
            this Privacy Policy and our processing of your information as described herein.
          </p>
        </section>
      </div>
    </div>
  );
};
