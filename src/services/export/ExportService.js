/**
 * Export & Reporting Service
 * Handles exporting cost data to CSV, PDF, and Excel
 * Also manages custom report generation and scheduling
 */

import { resolveApiRoot } from '../../config/api.config';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../../config/backendApiCapabilities';

const getDefaultApiBaseUrl = () => resolveApiRoot();

class ExportService {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || getDefaultApiBaseUrl();
    this.reportTemplates = new Map();
    this.scheduledReports = [];
    this.exportQueue = [];
  }

  /**
   * Initialize export service
   */
  async initialize(token) {
    this.token = token;

    // Load standard report templates
    this.registerTemplate('cost_summary', {
      name: 'Cost Summary Report',
      description: 'Summary of costs by tool and time period',
      metrics: ['totalCost', 'costByTool', 'topTools', 'trends'],
      formats: ['csv', 'pdf', 'xlsx'],
    });

    this.registerTemplate('roi_analysis', {
      name: 'ROI Analysis Report',
      description: 'Return on investment analysis',
      metrics: ['roi', 'timeSaved', 'valueCreated', 'netValue', 'roiByTool'],
      formats: ['csv', 'pdf', 'xlsx'],
    });

    this.registerTemplate('usage_patterns', {
      name: 'Usage Patterns Report',
      description: 'Tool usage analysis and patterns',
      metrics: [
        'executionCount',
        'usageByTool',
        'timeOfDayAnalysis',
        'favoriteTools',
        'trendingTools',
      ],
      formats: ['csv', 'pdf', 'xlsx'],
    });

    this.registerTemplate('budget_analysis', {
      name: 'Budget Analysis Report',
      description: 'Budget utilization and forecasting',
      metrics: [
        'budgetUtilization',
        'costTrends',
        'projectedCosts',
        'riskAssessment',
        'alerts',
      ],
      formats: ['csv', 'pdf', 'xlsx'],
    });

    this.registerTemplate('clinical_impact', {
      name: 'Clinical Impact Report',
      description: 'Clinical outcomes and tool effectiveness',
      metrics: [
        'toolEffectiveness',
        'clinicalOutcomes',
        'userSatisfaction',
        'emergencyAlerts',
        'recommendations',
      ],
      formats: ['csv', 'pdf', 'xlsx'],
    });
  }

  /**
   * Register custom report template
   */
  registerTemplate(templateId, config) {
    this.reportTemplates.set(templateId, {
      id: templateId,
      ...config,
      createdAt: new Date(),
    });
  }

  /**
   * Get available templates
   */
  getTemplates() {
    return Array.from(this.reportTemplates.values());
  }

  /**
   * Export cost data to CSV
   */
  async exportToCSV(data, filename = 'cost-report.csv') {
    try {
      const csvContent = this.convertToCSV(data);
      return this.downloadFile(csvContent, filename, 'text/csv');
    } catch (error) {
      console.error('[ExportService] CSV export error:', error);
      throw error;
    }
  }

  /**
   * Export cost data to PDF
   */
  async exportToPDF(data, filename = 'cost-report.pdf', options = {}) {
    if (!isBackendCapabilityEnabled('exportsPdf')) {
      const jsonName = filename.replace(/\.pdf$/i, '.json') || 'export.json';
      return this.downloadFile(JSON.stringify(data, null, 2), jsonName, 'application/json');
    }

    try {
      const payload = {
        data,
        options: {
          title: options.title || 'Cost Report',
          includeCharts: options.includeCharts !== false,
          pageSize: options.pageSize || 'A4',
          orientation: options.orientation || 'portrait',
          ...options,
        },
      };

      const response = await fetch(
        `${this.apiBaseUrl}/exports/pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`PDF export failed: ${response.status}`);
      }

      const blob = await response.blob();
      return this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('[ExportService] PDF export error:', error);
      throw error;
    }
  }

  /**
   * Export cost data to Excel
   */
  async exportToExcel(data, filename = 'cost-report.xlsx', options = {}) {
    if (!isBackendCapabilityEnabled('exportsExcel')) {
      const csvName = filename.replace(/\.xlsx$/i, '.csv') || 'export.csv';
      return this.exportToCSV(data, csvName);
    }

    try {
      const payload = {
        data,
        options: {
          sheetName: options.sheetName || 'Cost Report',
          includeCharts: options.includeCharts !== false,
          freezeHeader: options.freezeHeader !== false,
          autoFilter: options.autoFilter !== false,
          ...options,
        },
      };

      const response = await fetch(
        `${this.apiBaseUrl}/exports/excel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Excel export failed: ${response.status}`);
      }

      const blob = await response.blob();
      return this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('[ExportService] Excel export error:', error);
      throw error;
    }
  }

  /**
   * Generate report using template
   */
  async generateReport(templateId, dateRange, format = 'pdf', options = {}) {
    const template = this.reportTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (!template.formats.includes(format)) {
      throw new Error(`Format not supported by template: ${format}`);
    }

    if (!isBackendCapabilityEnabled('reportsGenerate')) {
      throw new Error('Scheduled reports are not available on this server.');
    }

    try {
      const payload = {
        templateId,
        dateRange: {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        },
        metrics: template.metrics,
        format,
        options,
      };

      const response = await fetch(
        `${this.apiBaseUrl}/reports/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.status}`);
      }

      const filename = `${templateId}-${Date.now()}.${this.getExtension(
        format
      )}`;
      const blob = await response.blob();
      return this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('[ExportService] Report generation error:', error);
      throw error;
    }
  }

  /**
   * Schedule recurring report
   */
  async scheduleReport(templateId, schedule, recipients, format = 'pdf') {
    if (!isBackendCapabilityEnabled('reportsSchedule')) {
      throw new Error(UNSUPPORTED_CAPABILITY_MESSAGE);
    }

    // schedule: { frequency: 'daily'|'weekly'|'monthly', dayOfWeek?: 0-6, dayOfMonth?: 1-31, time: '09:00' }
    // recipients: email addresses
    const scheduledReport = {
      id: `scheduled-${Date.now()}`,
      templateId,
      schedule,
      recipients,
      format,
      status: 'active',
      createdAt: new Date(),
      nextRun: this.calculateNextRun(schedule),
    };

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/reports/schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(scheduledReport),
        }
      );

      if (!response.ok) {
        throw new Error(`Schedule creation failed: ${response.status}`);
      }

      const saved = await response.json();
      this.scheduledReports.push(saved);
      return saved;
    } catch (error) {
      console.error('[ExportService] Schedule creation error:', error);
      throw error;
    }
  }

  /**
   * Calculate next run time for scheduled report
   */
  calculateNextRun(schedule) {
    const now = new Date();
    const nextRun = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly': {
        const daysUntilDay =
          ((schedule.dayOfWeek || 0) - nextRun.getDay() + 7) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilDay || 7));
        break;
      }
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth || 1);
        break;
    }

    const [hours, minutes] = (schedule.time || '09:00').split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    return nextRun;
  }

  /**
   * Get scheduled reports
   */
  getScheduledReports(templateId = null) {
    let reports = this.scheduledReports;

    if (templateId) {
      reports = reports.filter((r) => r.templateId === templateId);
    }

    return reports;
  }

  /**
   * Cancel scheduled report
   */
  async cancelScheduledReport(reportId) {
    if (!isBackendCapabilityEnabled('reportsSchedule')) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/reports/schedule/${reportId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (response.ok) {
        this.scheduledReports = this.scheduledReports.filter(
          (r) => r.id !== reportId
        );
        return true;
      }
    } catch (error) {
      console.error('[ExportService] Cancel error:', error);
    }

    return false;
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers
      .map((h) => `"${h}"`)
      .join(',');

    const csvRows = data
      .map((row) =>
        headers
          .map((h) => {
            const value = row[h];
            if (value === null || value === undefined) {
              return '';
            }
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          })
          .join(',')
      )
      .join('\n');

    return `${csvHeaders}\n${csvRows}`;
  }

  /**
   * Download file
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    return this.downloadBlob(blob, filename);
  }

  /**
   * Download blob
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { filename, size: blob.size, mimeType: blob.type };
  }

  /**
   * Get file extension for format
   */
  getExtension(format) {
    const extensions = {
      csv: 'csv',
      pdf: 'pdf',
      xlsx: 'xlsx',
      json: 'json',
    };
    return extensions[format] || format;
  }

  /**
   * Get export stats
   */
  getStats() {
    return {
      queueLength: this.exportQueue.length,
      templatesCount: this.reportTemplates.size,
      scheduledReportsCount: this.scheduledReports.length,
      activeSchedules: this.scheduledReports.filter((r) => r.status === 'active')
        .length,
    };
  }
}

// Singleton instance
let instance = null;

export function getExportService(apiBaseUrl) {
  if (!instance) {
    instance = new ExportService(apiBaseUrl);
  }
  return instance;
}

export default ExportService;
