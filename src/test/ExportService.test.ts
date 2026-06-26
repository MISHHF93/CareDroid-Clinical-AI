/**
 * Export Service Tests
 * Comprehensive test suite for exporting and reporting functionality
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ExportService from '../services/export/ExportService';

const capabilityEnabled = vi.hoisted(() => vi.fn());

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: (cap) => capabilityEnabled(cap),
  UNSUPPORTED_CAPABILITY_MESSAGE:
    'This feature is not available on the server yet. Use on-device export, chat, or try again after an update.',
}));

vi.mock('../services/apiErrorHandling', () => ({
  reportApiError: vi.fn(),
}));

describe('ExportService', () => {
  let service;

  beforeEach(() => {
    capabilityEnabled.mockReturnValue(false);
    service = new ExportService('http://localhost:3000/api');
    service.token = 'test-token';

    // Mock fetch
    global.fetch = vi.fn();

    // Mock document for downloads
    global.document = {
      createElement: vi.fn((_tag) => ({
        href: '',
        download: '',
        click: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    // Mock URL for blob operations
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should register default templates on initialize', async () => {
      await service.initialize('test-token');

      const templates = service.getTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(5);
      const templateIds = templates.map((t) => t.id);
      expect(templateIds).toContain('cost_summary');
      expect(templateIds).toContain('roi_analysis');
      expect(templateIds).toContain('usage_patterns');
      expect(templateIds).toContain('budget_analysis');
      expect(templateIds).toContain('clinical_impact');
    });

    it('should register custom template', () => {
      service.registerTemplate('custom-report', {
        name: 'Custom Report',
        description: 'Custom metrics report',
        metrics: ['metric1', 'metric2'],
        formats: ['csv', 'pdf'],
      });

      const template = service.reportTemplates.get('custom-report');
      expect(template).toBeDefined();
      expect(template.name).toBe('Custom Report');
    });

    it('should retrieve template by ID', async () => {
      await service.initialize('test-token');

      const template = service.reportTemplates.get('cost_summary');
      expect(template).toBeDefined();
      expect(template.metrics).toContain('totalCost');
    });

    it('should support multiple formats per template', async () => {
      await service.initialize('test-token');

      const template = service.reportTemplates.get('cost_summary');
      expect(template.formats).toContain('csv');
      expect(template.formats).toContain('pdf');
      expect(template.formats).toContain('xlsx');
    });
  });

  describe('CSV Export', () => {
    it('should export data to CSV', async () => {
      const data = [
        { tool: 'drug-checker', cost: '100.00', usage: '5' },
        { tool: 'lab-interpreter', cost: '75.00', usage: '3' },
      ];

      const result = await service.exportToCSV(data, 'test.csv');

      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('size');
      expect(result.filename).toBe('test.csv');
    });

    it('should convert array to CSV format', () => {
      const data = [
        { name: 'Tool 1', cost: 100 },
        { name: 'Tool 2', cost: 200 },
      ];

      const csv = service.convertToCSV(data);

      expect(csv).toContain('"name","cost"');
      expect(csv).toContain('Tool 1');
      expect(csv).toContain('100');
      expect(csv).toContain('Tool 2');
      expect(csv).toContain('200');
    });

    it('should handle special characters in CSV', () => {
      const data = [
        { tool: 'Tool, With, Commas', cost: 100 },
        { tool: 'Tool "Quoted"', cost: 200 },
      ];

      const csv = service.convertToCSV(data);

      expect(csv).toContain('"');
    });

    it('should handle empty data', () => {
      const csv = service.convertToCSV([]);
      expect(csv).toBe('');
    });
  });

  describe('PDF Export', () => {
    it('should export data to PDF via client JSON when server PDF API is unavailable', async () => {
      const data = [{ tool: 'drug-checker', cost: '100.00' }];
      const downloadSpy = vi.spyOn(service, 'downloadFile').mockImplementation(() => true);

      await service.exportToPDF(data, 'test.pdf');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.stringContaining('drug-checker'),
        'test.json',
        'application/json',
      );
      downloadSpy.mockRestore();
    });

    it('should fall back to JSON download when server PDF is unavailable', async () => {
      const downloadSpy = vi.spyOn(service, 'downloadFile').mockImplementation(() => true);
      await service.exportToPDF({ title: 'Custom Title' }, 'report.pdf');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom Title'),
        'report.json',
        'application/json',
      );
      downloadSpy.mockRestore();
    });
  });

  describe('Excel Export', () => {
    it('should export data to CSV when server Excel API is unavailable', async () => {
      const data = [{ tool: 'drug-checker', cost: '100.00' }];
      const csvSpy = vi.spyOn(service, 'exportToCSV').mockResolvedValue(true);

      await service.exportToExcel(data, 'test.xlsx');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(csvSpy).toHaveBeenCalledWith(data, 'test.csv');
      csvSpy.mockRestore();
    });
  });

  describe('Report Generation', () => {
    it('should export a local mock report when server reports API is unavailable', async () => {
      await service.initialize('test-token');
      const downloadSpy = vi.spyOn(service, 'downloadFile').mockImplementation(() => true);

      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      await service.generateReport('cost_summary', dateRange, 'pdf');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.stringContaining('"source": "local-mock"'),
        expect.stringMatching(/^cost_summary-\d+\.json$/),
        'application/json',
      );
      downloadSpy.mockRestore();
    });

    it('should reject invalid template', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      await expect(
        service.generateReport('invalid-template', dateRange)
      ).rejects.toThrow('Template not found');
    });

    it('should reject unsupported format', async () => {
      await service.initialize('test-token');

      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      await expect(
        service.generateReport('cost_summary', dateRange, 'xml')
      ).rejects.toThrow('Format not supported');
    });
  });

  describe('Scheduled Reports', () => {
    beforeEach(() => {
      capabilityEnabled.mockImplementation((cap) =>
        ['reportsSchedule', 'reportsGenerate'].includes(cap),
      );
    });

    it('should create a typed local schedule fallback when reportsSchedule capability is disabled', async () => {
      capabilityEnabled.mockImplementation((cap) => cap === 'reportsGenerate');

      const scheduled = await service.scheduleReport(
        'cost_summary',
        { frequency: 'daily', time: '09:00' },
        ['user@example.com'],
      );

      expect(global.fetch).not.toHaveBeenCalled();
      expect(scheduled).toMatchObject({
        templateId: 'cost_summary',
        status: 'backend-unavailable',
        unavailable: true,
      });
    });

    it('should schedule report', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'scheduled-123',
          templateId: 'cost_summary',
          status: 'active',
        }),
      });

      const scheduled = await service.scheduleReport(
        'cost_summary',
        { frequency: 'daily', time: '09:00' },
        ['user@example.com'],
        'pdf'
      );

      expect(scheduled).toHaveProperty('id');
      expect(scheduled.status).toBe('active');
    });

    it('should calculate next run for daily schedules', () => {
      const now = new Date();
      const nextRun = service.calculateNextRun({
        frequency: 'daily',
        time: '09:00',
      });

      expect(nextRun > now).toBe(true);
    });

    it('should calculate next run for weekly schedules', () => {
      const nextRun = service.calculateNextRun({
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        time: '09:00',
      });

      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getDay()).toBe(1);
    });

    it('should calculate next run for monthly schedules', () => {
      const nextRun = service.calculateNextRun({
        frequency: 'monthly',
        dayOfMonth: 15,
        time: '09:00',
      });

      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getDate()).toBe(15);
    });

    it('should retrieve scheduled reports', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'scheduled-123',
          templateId: 'cost_summary',
        }),
      });

      await service.scheduleReport(
        'cost_summary',
        { frequency: 'daily', time: '09:00' },
        ['user@example.com']
      );

      const reports = service.getScheduledReports();

      expect(reports.length).toBeGreaterThan(0);
    });

    it('should filter scheduled reports by template', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'scheduled-123',
        }),
      });

      await service.scheduleReport(
        'cost_summary',
        { frequency: 'daily', time: '09:00' },
        ['user@example.com']
      );

      const reports = service.getScheduledReports('cost_summary');

      expect(reports.every((r) => r.templateId === 'cost_summary')).toBe(true);
    });

    it('should cancel scheduled report', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'scheduled-123' }),
      });

      await service.scheduleReport(
        'cost_summary',
        { frequency: 'daily', time: '09:00' },
        ['user@example.com']
      );

      global.fetch.mockResolvedValueOnce({
        ok: true,
      });

      const success = await service.cancelScheduledReport('scheduled-123');

      expect(success).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return export statistics', () => {
      service.initialize('test-token');
      const stats = service.getStats();

      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('templatesCount');
      expect(stats).toHaveProperty('scheduledReportsCount');
      expect(stats).toHaveProperty('activeSchedules');
      expect(stats.templatesCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('File Extension', () => {
    it('should return correct file extension', () => {
      expect(service.getExtension('csv')).toBe('csv');
      expect(service.getExtension('pdf')).toBe('pdf');
      expect(service.getExtension('xlsx')).toBe('xlsx');
      expect(service.getExtension('json')).toBe('json');
    });
  });
});
