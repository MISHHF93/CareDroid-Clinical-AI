import './LegalPage.css';

/**
 * Terms of Service Page
 * 
 * Legal terms and conditions for using CareDroid
 * REQUIRED for app store submission
 */
export const TermsOfService = () => {
  return (
    <div className="legal-page">
      <div className="legal-header">
        <h1>Terms of Service</h1>
        <p className="legal-meta">Last Updated: January 31, 2026</p>
        <p className="legal-intro">
          These Terms of Service ("Terms") govern your access to and use of CareDroid Clinical AI 
          ("CareDroid", "Service", "Platform"). Please read these Terms carefully before using 
          the Service.
        </p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using CareDroid, you agree to be bound by these Terms and our Privacy 
            Policy. If you do not agree to these Terms, you may not access or use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you ("User", "you", "your") 
            and CareDroid, Inc. ("CareDroid", "we", "us", "our").
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Service Description</h2>
          <p>
            CareDroid is an AI-powered clinical decision support tool designed to assist healthcare 
            professionals with:
          </p>
          <ul>
            <li>Evidence-based clinical recommendations</li>
            <li>Medical calculations and scoring tools (SOFA, qSOFA, CHA2DS2-VASc, HAS-BLED, etc.)</li>
            <li>Drug interaction checking and contraindication alerts</li>
            <li>Laboratory result interpretation</li>
            <li>Retrieval-Augmented Generation (RAG) with medical literature citations</li>
            <li>Emergency detection and escalation recommendations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Medical Disclaimer</h2>
          <div className="legal-warning">
            <p><strong>⚠️ CRITICAL DISCLAIMER - READ CAREFULLY</strong></p>
            <p>
              CareDroid is a <strong>DECISION SUPPORT TOOL ONLY</strong>. It is NOT a substitute 
              for professional medical judgment, diagnosis, or treatment.
            </p>
            <ul>
              <li><strong>Not a Medical Device:</strong> CareDroid is not FDA-approved as a medical device</li>
              <li><strong>Not for Diagnosis:</strong> Do not use CareDroid as the sole basis for diagnosis</li>
              <li><strong>Not for Treatment Decisions:</strong> Always verify recommendations with current clinical guidelines</li>
              <li><strong>Not for Emergencies:</strong> In life-threatening situations, call 911 immediately</li>
              <li><strong>Human Oversight Required:</strong> All AI-generated recommendations must be reviewed by a qualified healthcare professional</li>
              <li><strong>May Contain Errors:</strong> AI models can produce inaccurate or incomplete information</li>
            </ul>
            <p>
              <strong>You assume full responsibility for all clinical decisions made using CareDroid.</strong> 
              We are not liable for any adverse outcomes resulting from your use of the Service.
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>4. Eligibility and User Accounts</h2>
          
          <h3>4.1 Eligibility</h3>
          <p>To use CareDroid, you must:</p>
          <ul>
            <li>Be a licensed healthcare professional (Physician, Nurse, Advanced Practice Provider) OR</li>
            <li>Be a medical/nursing student under supervision OR</li>
            <li>Be an administrator at a healthcare organization</li>
            <li>Be at least 18 years of age</li>
            <li>Have the legal capacity to enter into binding contracts</li>
            <li>Comply with all applicable local, state, and federal laws</li>
          </ul>
          
          <h3>4.2 Account Registration</h3>
          <ul>
            <li>You must provide accurate and complete registration information</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You must enable multi-factor authentication (2FA) as required</li>
            <li>You are responsible for all activities that occur under your account</li>
            <li>You must notify us immediately of any unauthorized access</li>
          </ul>
          
          <h3>4.3 Account Termination</h3>
          <p>We reserve the right to suspend or terminate your account if you:</p>
          <ul>
            <li>Violate these Terms of Service</li>
            <li>Provide false or misleading information</li>
            <li>Use the Service for unlawful purposes</li>
            <li>Compromise the security or integrity of the Service</li>
            <li>Engage in abusive behavior toward other users or our staff</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Acceptable Use Policy</h2>
          
          <h3>5.1 Permitted Uses</h3>
          <p>You may use CareDroid solely for:</p>
          <ul>
            <li>Clinical decision support in your professional practice</li>
            <li>Educational purposes (students and trainees)</li>
            <li>Research (with appropriate IRB approval)</li>
          </ul>
          
          <h3>5.2 Prohibited Uses</h3>
          <p>You may NOT:</p>
          <ul>
            <li>Use CareDroid to diagnose or treat yourself or family members</li>
            <li>Share your account credentials with unauthorized users</li>
            <li>Attempt to reverse engineer, decompile, or extract the AI models</li>
            <li>Scrape, data mine, or extract data from the Service</li>
            <li>Use the Service to generate discriminatory or biased recommendations</li>
            <li>Input fabricated or false patient data</li>
            <li>Use the Service for marketing or commercial purposes unrelated to patient care</li>
            <li>Overload or disrupt the Service (DoS attacks, spam, etc.)</li>
            <li>Circumvent security measures or access controls</li>
            <li>Use the Service in violation of HIPAA or other healthcare regulations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. HIPAA Compliance and PHI</h2>
          
          <h3>6.1 Business Associate Relationship</h3>
          <p>
            If you are a Covered Entity under HIPAA, you must execute a Business Associate Agreement 
            (BAA) with CareDroid before entering Protected Health Information (PHI) into the Service.
          </p>
          
          <h3>6.2 Your Responsibilities</h3>
          <ul>
            <li>Obtain patient authorization before entering PHI into CareDroid</li>
            <li>Use minimum necessary PHI for queries</li>
            <li>De-identify or anonymize patient data when possible</li>
            <li>Ensure your organization's HIPAA policies are followed</li>
            <li>Report any suspected PHI breaches to us immediately</li>
          </ul>
          
          <h3>6.3 Our Responsibilities</h3>
          <ul>
            <li>Maintain administrative, physical, and technical safeguards for PHI</li>
            <li>Report breaches of unsecured PHI within 60 days</li>
            <li>Allow access to PHI for audit or investigation</li>
            <li>Return or destroy PHI upon termination of your account</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Intellectual Property Rights</h2>
          
          <h3>7.1 CareDroid's IP</h3>
          <p>
            All rights, title, and interest in and to the Service, including all software, AI models, 
            algorithms, designs, trademarks, and content, are owned by CareDroid. These Terms do not 
            grant you any ownership rights.
          </p>
          
          <h3>7.2 Your Content</h3>
          <p>
            You retain ownership of any patient data or clinical information you input into CareDroid. 
            By using the Service, you grant us a limited license to process your content solely for 
            the purpose of providing the Service.
          </p>
          
          <h3>7.3 Feedback</h3>
          <p>
            If you provide feedback, suggestions, or ideas about CareDroid, you grant us a perpetual, 
            royalty-free license to use such feedback to improve the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Fees and Payment</h2>
          
          <h3>8.1 Subscription Plans</h3>
          <p>
            CareDroid offers various subscription tiers (Free, Professional, Enterprise). Fees are 
            billed monthly or annually based on your selected plan.
          </p>
          
          <h3>8.2 Payment Terms</h3>
          <ul>
            <li>All fees are non-refundable unless required by law</li>
            <li>Fees are exclusive of taxes (which you are responsible for)</li>
            <li>We may change fees with 30 days' notice</li>
            <li>Failure to pay may result in service suspension</li>
          </ul>
          
          <h3>8.3 Free Trial</h3>
          <p>
            Free trials are available for new users. After the trial period, you will be charged 
            unless you cancel before the trial ends.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Limitation of Liability</h2>
          <div className="legal-warning">
            <p><strong>READ THIS SECTION CAREFULLY - IT LIMITS OUR LIABILITY</strong></p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAREDROID SHALL NOT BE LIABLE FOR:
            </p>
            <ul>
              <li>ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
              <li>LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL</li>
              <li>PATIENT HARM OR ADVERSE MEDICAL OUTCOMES</li>
              <li>MEDICAL MALPRACTICE CLAIMS RELATED TO USE OF THE SERVICE</li>
              <li>ERRORS, OMISSIONS, OR INACCURACIES IN AI-GENERATED RECOMMENDATIONS</li>
              <li>SERVICE INTERRUPTIONS, DOWNTIME, OR DATA LOSS</li>
            </ul>
            <p>
              IN NO EVENT SHALL CAREDROID'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID US IN THE 
              12 MONTHS PRECEDING THE CLAIM.
            </p>
            <p>
              SOME JURISDICTIONS DO NOT ALLOW LIMITATION OF LIABILITY, SO THESE LIMITATIONS MAY NOT 
              APPLY TO YOU.
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>10. Disclaimers and Warranties</h2>
          <div className="legal-warning">
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul>
              <li>MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>ACCURACY, RELIABILITY, OR COMPLETENESS OF INFORMATION</li>
              <li>UNINTERRUPTED OR ERROR-FREE OPERATION</li>
              <li>FREEDOM FROM VIRUSES OR HARMFUL COMPONENTS</li>
            </ul>
            <p>
              WE DO NOT WARRANT THAT AI RECOMMENDATIONS ARE CLINICALLY ACCURATE OR APPROPRIATE FOR 
              YOUR SPECIFIC PATIENT.
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless CareDroid, its officers, directors, 
            employees, and agents from any claims, liabilities, damages, losses, and expenses 
            (including legal fees) arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Medical malpractice or negligence claims related to patient care</li>
            <li>Your breach of HIPAA or other healthcare regulations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>12. Data Security and Breaches</h2>
          <ul>
            <li>We implement industry-standard security measures (see Privacy Policy)</li>
            <li>However, no system is 100% secure</li>
            <li>You are responsible for reporting suspected breaches immediately</li>
            <li>We will notify you of breaches affecting your PHI as required by HIPAA</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>13. Modifications to Terms</h2>
          <p>
            We may modify these Terms at any time. Material changes will be communicated via:
          </p>
          <ul>
            <li>Email notification</li>
            <li>In-app notification banner</li>
            <li>Updated "Last Updated" date</li>
          </ul>
          <p>
            Continued use after changes constitutes acceptance. If you disagree with changes, 
            you must stop using the Service and close your account.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Termination</h2>
          
          <h3>14.1 Your Right to Terminate</h3>
          <p>
            You may terminate your account at any time through the Settings page or by contacting 
            support. Data deletion will occur within 30 days (subject to legal retention requirements).
          </p>
          
          <h3>14.2 Our Right to Terminate</h3>
          <p>
            We may suspend or terminate your access immediately if you violate these Terms, 
            without notice or liability.
          </p>
          
          <h3>14.3 Effect of Termination</h3>
          <ul>
            <li>Your access to the Service will cease immediately</li>
            <li>Outstanding fees remain due</li>
            <li>We will return or destroy PHI as required by HIPAA</li>
            <li>Sections 3, 7, 9, 10, 11, and 15 survive termination</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>15. Dispute Resolution</h2>
          
          <h3>15.1 Governing Law</h3>
          <p>
            These Terms are governed by the laws of [State], United States, without regard to 
            conflict of law principles.
          </p>
          
          <h3>15.2 Arbitration</h3>
          <p>
            Any disputes arising from these Terms shall be resolved through binding arbitration 
            in accordance with the American Arbitration Association rules, except for:
          </p>
          <ul>
            <li>Claims for injunctive relief</li>
            <li>Intellectual property disputes</li>
            <li>Small claims court matters (under $10,000)</li>
          </ul>
          
          <h3>15.3 Class Action Waiver</h3>
          <p>
            You agree to resolve disputes individually and waive your right to participate in 
            class actions, class arbitrations, or representative actions.
          </p>
        </section>

        <section className="legal-section">
          <h2>16. Miscellaneous</h2>
          <ul>
            <li><strong>Entire Agreement:</strong> These Terms and the Privacy Policy constitute the entire agreement</li>
            <li><strong>Severability:</strong> If any provision is invalid, the remainder remains in effect</li>
            <li><strong>No Waiver:</strong> Failure to enforce a right does not waive that right</li>
            <li><strong>Assignment:</strong> You may not assign these Terms; we may assign without notice</li>
            <li><strong>Force Majeure:</strong> We are not liable for delays caused by events beyond our control</li>
            <li><strong>Export Compliance:</strong> You agree to comply with U.S. export control laws</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>17. Contact Information</h2>
          <div className="contact-info">
            <p><strong>Legal Department:</strong></p>
            <p>CareDroid, Inc.</p>
            <p>Email: <a href="mailto:legal@caredroid.ai">legal@caredroid.ai</a></p>
            <p>Phone: 1-800-CAREDROID</p>
            <p>Address: [Company Address]</p>
          </div>
          
          <div className="contact-info">
            <p><strong>For Terms-Related Questions:</strong></p>
            <p>Email: <a href="mailto:support@caredroid.ai">support@caredroid.ai</a></p>
          </div>
        </section>

        <section className="legal-section legal-footer-section">
          <p className="legal-acknowledgment">
            BY CLICKING "I AGREE" OR BY ACCESSING OR USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU 
            HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
          </p>
        </section>
      </div>
    </div>
  );
};
