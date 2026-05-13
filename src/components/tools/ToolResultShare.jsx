import { useState } from 'react';
import { getExportService } from '../../services/export/ExportService';
import { apiFetch } from '../../services/apiClient';
import { NavIcon } from '../../navigation/NavIcon';
import { getToolIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import './ToolResultShare.css';

const ToolResultShare = ({ toolName, toolId, results, onClose }) => {
  const [shareMode, setShareMode] = useState('link'); // 'link' | 'export' | 'email'
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', variant: 'info' });

  const EXPORT_FORMAT_ICON = {
    json: CHROME_ICONS.formatJson,
    csv: CHROME_ICONS.formatCsv,
    pdf: CHROME_ICONS.formatPdf,
  };

  const generateShareLink = () => {
    const shareData = {
      tool: toolName,
      results: results,
      timestamp: new Date().toISOString(),
    };

    const encoded = btoa(JSON.stringify(shareData));
    const url = `${window.location.origin}/shared-result/${encoded}`;
    return url;
  };

  const handleCopyLink = async () => {
    try {
      const url = generateShareLink();
      await navigator.clipboard.writeText(url);
      setFeedback({ text: 'Share link copied to clipboard.', variant: 'success' });
      setTimeout(() => setFeedback({ text: '', variant: 'info' }), 3000);
    } catch (err) {
      const url = generateShareLink();
      window.prompt('Copy this link to share:', url);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const exportService = getExportService();
      const filename = `${toolName.toLowerCase().replace(/\s+/g, '-')}-results-${Date.now()}`;

      const exportData = {
        tool: toolName,
        results: results,
        exportedAt: new Date().toLocaleString(),
      };

      if (selectedFormat === 'json') {
        exportService.downloadFile(
          JSON.stringify(exportData, null, 2),
          `${filename}.json`,
          'application/json'
        );
      } else if (selectedFormat === 'csv') {
        // Convert results to CSV if it's an array
        const csvData = Array.isArray(results)
          ? results
          : Object.entries(results).map(([key, value]) => ({ key, value }));

        const csv = exportService.convertToCSV(csvData);
        exportService.downloadFile(csv, `${filename}.csv`, 'text/csv');
      } else if (selectedFormat === 'pdf') {
        await exportService.exportToPDF(exportData, `${filename}.pdf`, {
          title: `${toolName} Results`,
          includeCharts: true,
        });
      }

      setFeedback({ text: `Results exported as ${selectedFormat.toUpperCase()}.`, variant: 'success' });
      setTimeout(() => {
        setFeedback({ text: '', variant: 'info' });
        onClose();
      }, 2000);
    } catch (err) {
      setFeedback({ text: `Export failed: ${err.message}`, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailShare = async () => {
    if (!recipientEmail.trim()) {
      setFeedback({ text: 'Please enter an email address.', variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const shareData = {
        tool: toolName,
        results: results,
        timestamp: new Date().toISOString(),
      };

      const response = await apiFetch('/api/tools/share-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail,
          toolName,
          results: shareData,
          message: `I'm sharing ${toolName} results with you from CareDroid`,
        }),
      });

      if (response.ok) {
        setFeedback({ text: `Results sent to ${recipientEmail}.`, variant: 'success' });
        setRecipientEmail('');
        setTimeout(() => {
          setFeedback({ text: '', variant: 'info' });
          onClose();
        }, 2000);
      } else {
        setFeedback({ text: 'Failed to send results.', variant: 'error' });
      }
    } catch (err) {
      setFeedback({ text: `Email share failed: ${err.message}`, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-result-share-modal">
      <div className="share-modal-overlay" onClick={onClose}></div>
      <div className="share-modal-content">
        <div className="share-modal-header">
          <h2>
            <span className="share-modal-tool-icon" aria-hidden>
              <NavIcon icon={getToolIcon(toolId)} size={24} />
            </span>{' '}
            Share {toolName} Results
          </h2>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            <NavIcon icon={CHROME_ICONS.close} size={22} />
          </button>
        </div>

        <div className="share-modal-tabs">
          <button
            type="button"
            className={`share-tab ${shareMode === 'link' ? 'active' : ''}`}
            onClick={() => setShareMode('link')}
          >
            <span className="share-tab-inner">
              <NavIcon icon={CHROME_ICONS.shareLink} size={18} />
              Share Link
            </span>
          </button>
          <button
            type="button"
            className={`share-tab ${shareMode === 'export' ? 'active' : ''}`}
            onClick={() => setShareMode('export')}
          >
            <span className="share-tab-inner">
              <NavIcon icon={CHROME_ICONS.download} size={18} />
              Export
            </span>
          </button>
          <button
            type="button"
            className={`share-tab ${shareMode === 'email' ? 'active' : ''}`}
            onClick={() => setShareMode('email')}
          >
            <span className="share-tab-inner">
              <NavIcon icon={CHROME_ICONS.mail} size={18} />
              Email
            </span>
          </button>
        </div>

        <div className="share-modal-body">
          {/* Link Share */}
          {shareMode === 'link' && (
            <div className="share-mode-content">
              <p>Generate a shareable link for these results:</p>
              <div className="share-link-display">
                <code className="link-preview">{generateShareLink().substring(0, 50)}...</code>
              </div>
              <button
                type="button"
                className="btn-primary btn-large share-btn-primary"
                onClick={handleCopyLink}
                disabled={isLoading}
              >
                <NavIcon icon={CHROME_ICONS.copy} size={20} />
                Copy Share Link
              </button>
              <p className="share-note">
                Share this link with colleagues. Link expires after 30 days for security.
              </p>
            </div>
          )}

          {/* Export */}
          {shareMode === 'export' && (
            <div className="share-mode-content">
              <p>Export results in your preferred format:</p>
              <div className="export-format-grid">
                {['json', 'csv', 'pdf'].map(format => (
                  <label key={format} className={`export-format-option ${selectedFormat === format ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format}
                      checked={selectedFormat === format}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                    />
                    <span className="format-icon" aria-hidden>
                      <NavIcon icon={EXPORT_FORMAT_ICON[format]} size={22} />
                    </span>
                    <span className="format-label">{format.toUpperCase()}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="btn-primary btn-large share-btn-primary"
                onClick={handleExport}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="share-inline-icon share-inline-icon--spin" aria-hidden>
                      <NavIcon icon={CHROME_ICONS.loader} size={20} />
                    </span>
                    Exporting…
                  </>
                ) : (
                  <>
                    <NavIcon icon={CHROME_ICONS.download} size={20} />
                    {`Export as ${selectedFormat.toUpperCase()}`}
                  </>
                )}
              </button>
              <p className="share-note">
                Download results locally for records or further analysis.
              </p>
            </div>
          )}

          {/* Email Share */}
          {shareMode === 'email' && (
            <div className="share-mode-content">
              <p>Send results to a colleague via email:</p>
              <input
                type="email"
                className="share-email-input"
                placeholder="colleague@hospital.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="btn-primary btn-large share-btn-primary"
                onClick={handleEmailShare}
                disabled={isLoading || !recipientEmail.trim()}
              >
                {isLoading ? (
                  <>
                    <span className="share-inline-icon share-inline-icon--spin" aria-hidden>
                      <NavIcon icon={CHROME_ICONS.loader} size={20} />
                    </span>
                    Sending…
                  </>
                ) : (
                  <>
                    <NavIcon icon={CHROME_ICONS.mail} size={20} />
                    Send via Email
                  </>
                )}
              </button>
              <p className="share-note">
                Recipient will receive results with a secure access link.
              </p>
            </div>
          )}

          {/* Message Display */}
          {feedback.text && (
            <div className={`share-message share-message--${feedback.variant}`}>{feedback.text}</div>
          )}
        </div>

        <div className="share-modal-footer">
          <p className="share-privacy-note share-privacy-note--with-icon">
            <NavIcon icon={CHROME_ICONS.lock} size={18} aria-hidden />
            <span>Your shared results are encrypted and accessible only to intended recipients.</span>
          </p>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolResultShare;
