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
import { makeDisabledCapabilityResponse } from '../disabledBackendMocks';
import { reportApiError } from '../apiErrorHandling';
import logger from '../../utils/logger';

const getDefaultApiBaseUrl = () => resolveApiRoot();

class ExportService {
  apiBaseUrl: string;
  reportTemplates: Map<string, any>;
  scheduledReports: any[];
  exportQueue: any[];
  token?: string;

  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || getDefaultApiBaseUrl();
    this.reportTemplates = new Map();
    this.scheduledReports = [] as any[];
    this.exportQueue = [] as any[];
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
    } catch (error: any) {
      reportApiError({
        title: 'CSV export failed',
        message: 'Unable to create the local CSV export.',
        error,
        endpoint: 'local:export/csv',
      });
      throw error;
    }
  }

  /**
   * Export cost data to PDF
   */
  async exportToPDF(data, filename = 'cost-report.pdf', options: any = {}) {
    if (!isBackendCapabilityEnabled('exportsPdf')) {
      // TODO(backend): Replace this local JSON export with POST /api/exports/pdf.
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
    } catch (error: any) {
      reportApiError({
        title: 'PDF export failed',
        message: 'Unable to export PDF from the server.',
        error,
        endpoint: '/api/exports/pdf',
      });
      throw error;
    }
  }

  /**
   * Export cost data to Excel
   */
  async exportToExcel(data, filename = 'cost-report.xlsx', options: any = {}) {
    if (!isBackendCapabilityEnabled('exportsExcel')) {
      // TODO(backend): Replace this local CSV export with POST /api/exports/excel.
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
    } catch (error: any) {
      reportApiError({
        title: 'Excel export failed',
        message: 'Unable to export Excel from the server.',
        error,
        endpoint: '/api/exports/excel',
      });
      throw error;
    }
  }

  /**
   * Generate report using template
   */
  async generateReport(templateId, dateRange, format = 'pdf', options: any = {}) {
    const template = this.reportTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (!template.formats.includes(format)) {
      throw new Error(`Format not supported by template: ${format}`);
    }

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

    if (!isBackendCapabilityEnabled('reportsGenerate')) {
      // TODO(backend): Replace with POST /api/reports/generate when the reports backend ships.
      const fallback = makeDisabledCapabilityResponse('reportsGenerate', '/api/reports/generate', {
        report: {
          ...payload,
          generatedAt: new Date().toISOString(),
          source: 'local-mock',
        },
      } as any);
      logger.info('Report generation backend unavailable — exporting local mock report');
      reportApiError({
        title: 'Report generation unavailable',
        message: fallback.message,
        endpoint: '/api/reports/generate',
      });
      const filename = `${templateId}-${Date.now()}.json`;
      return this.downloadFile(JSON.stringify((fallback.data as any)?.report, null, 2), filename, 'application/json');
    }

    try {

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
    } catch (error: any) {
      reportApiError({
        title: 'Report generation failed',
        message: 'Unable to generate the report from the server.',
        error,
        endpoint: '/api/reports/generate',
      });
      throw error;
    }
  }

  /**
   * Schedule recurring report
   */
  async scheduleReport(templateId, schedule, recipients, format = 'pdf') {
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

    if (!isBackendCapabilityEnabled('reportsSchedule')) {
      // TODO(backend): Replace with POST /api/reports/schedule when durable schedules are available.
      const fallback = {
        ...scheduledReport,
        status: 'backend-unavailable',
        unavailable: true,
        message: UNSUPPORTED_CAPABILITY_MESSAGE,
      };
      this.scheduledReports.push(fallback);
      reportApiError({
        title: 'Scheduled reports unavailable',
        message: fallback.message,
        endpoint: '/api/reports/schedule',
      });
      return fallback;
    }

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
    } catch (error: any) {
      reportApiError({
        title: 'Schedule creation failed',
        message: 'Unable to create the scheduled report on the server.',
        error,
        endpoint: '/api/reports/schedule',
      });
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
      this.scheduledReports = this.scheduledReports.filter((r) => r.id !== reportId);
      return {
        ok: false,
        success: false,
        unavailable: true,
        message: UNSUPPORTED_CAPABILITY_MESSAGE,
      };
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
    } catch (error: any) {
      reportApiError({
        title: 'Scheduled report cancellation failed',
        message: 'Unable to cancel the scheduled report on the server.',
        error,
        endpoint: `/api/reports/schedule/${reportId}`,
      });
    }

    return { ok: false, success: false };
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
let instance: any = null;

export function getExportService(apiBaseUrl = undefined) {
  if (!instance) {
    instance = new ExportService(apiBaseUrl);
  }
  return instance;
}

export default ExportService;
