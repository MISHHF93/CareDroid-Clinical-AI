import { Link, useNavigate } from 'react-router-dom';
import './PublicShell.css';
import appConfig from '../config/appConfig';

/**
 * PublicShell Layout
 * 
 * Minimal layout for public pages (privacy policy, terms, help)
 * - Simple header with logo and navigation
 * - Full-width content area
 * - Footer with legal links
 */
export const PublicShell = ({ children }) => {
  const navigate = useNavigate();
  const appName = appConfig.app.name;
  const appVersion = appConfig.app.version;
  const buildDate = appConfig.app.buildDate;
  const privacyUrl = appConfig.legal.privacyPolicyUrl;
  const termsUrl = appConfig.legal.termsOfServiceUrl;
  const supportUrl = appConfig.legal.supportUrl;
  const hipaaUrl = appConfig.legal.hipaaBaaUrl;

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-content">
          <Link to="/" className="public-logo">
            <span className="logo-icon">⚕️</span>
            <span className="logo-text">{appName}</span>
          </Link>

          <nav className="public-nav">
            <Link to="/help" className="public-nav-link">Help</Link>
            <Link to="/privacy" className="public-nav-link">Privacy</Link>
            <Link to="/terms" className="public-nav-link">Terms</Link>
            <button 
              onClick={() => navigate('/auth')} 
              className="btn-public-primary"
            >
              Sign In
            </button>
          </nav>
        </div>
      </header>

      <main className="public-main" id="main-content">
        {children}
      </main>

      <footer className="public-footer">
        <div className="public-footer-content">
          <div className="footer-section">
            <h4>{appName}</h4>
            <p>Evidence-based clinical decision support powered by AI</p>
            <div className="footer-badges">
              <span className="badge-hipaa">🔒 HIPAA Compliant</span>
              <span className="badge-version">v{appVersion}</span>
              {buildDate ? <span className="badge-version">Build {buildDate}</span> : null}
            </div>
          </div>

          <div className="footer-section">
            <h4>Legal</h4>
            <ul className="footer-links">
              <li>
                {privacyUrl ? (
                  <a href={privacyUrl} target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                ) : (
                  <Link to="/privacy">Privacy Policy</Link>
                )}
              </li>
              <li>
                {termsUrl ? (
                  <a href={termsUrl} target="_blank" rel="noopener noreferrer">Terms of Service</a>
                ) : (
                  <Link to="/terms">Terms of Service</Link>
                )}
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul className="footer-links">
              <li><Link to="/help">Help Center</Link></li>
              <li><a href="https://github.com/caredroid" target="_blank" rel="noopener noreferrer">Documentation</a></li>
              <li>
                {supportUrl ? (
                  <a href={supportUrl} target="_blank" rel="noopener noreferrer">Contact Support</a>
                ) : (
                  <a href="mailto:support@caredroid.ai">Contact Support</a>
                )}
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Compliance</h4>
            <ul className="footer-links">
              <li>
                {hipaaUrl ? (
                  <a href={hipaaUrl} target="_blank" rel="noopener noreferrer">HIPAA Compliance</a>
                ) : (
                  <Link to="/hipaa">HIPAA Compliance</Link>
                )}
              </li>
              <li><Link to="/gdpr">GDPR Notice</Link></li>
              <li><Link to="/hipaa">HIPAA Notice</Link></li>
              <li><a href="#security">Security Practices</a></li>
              <li><a href="#audit">Audit Logs</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} CareDroid-Clinical-AI. All rights reserved.</p>
          <p className="footer-disclaimer">
            CareDroid-Clinical-AI is a clinical decision support tool. Always use clinical judgment and follow your facility's protocols.
          </p>
        </div>
      </footer>
    </div>
  );
};
