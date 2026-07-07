import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import {
  UnifiedPatient as Patient,
  type IUnifiedPatient as IPatient,
} from '../models/unified-patient.model';

const logger = new Logger('BoardingService');

export interface BoardingMetrics {
  medianBoardTime: number;
  meanBoardTime: number;
  patientsBoarding: number;
  patientsExceeding4Hours: IPatient[];
  patientsExceeding6Hours: IPatient[];
  patientsExceeding8Hours: IPatient[];
  benchmarkStatus: 'below_benchmark' | 'at_benchmark' | 'exceeds_benchmark';
}

export interface BoardReport {
  timestamp: Date;
  metrics: BoardingMetrics;
  recommendations: string[];
  colorCode: 'green' | 'yellow' | 'orange' | 'red';
}

export interface BoardingDecisionResult {
  patient: IPatient;
  boardingStartTime: Date;
  clinicianId: string;
}

export class BoardingService extends EventEmitter {
  private readonly BENCHMARK_MINUTES = 158;
  private readonly WARNING_THRESHOLD = 240;
  private readonly CRITICAL_THRESHOLD = 360;
  private readonly SEVERE_THRESHOLD = 480;

  /**
   * Track decision-to-admit timestamp, the starting point for ED boarding.
   */
  async trackDecisionToAdmit(
    patientId: string,
    clinicianId: string,
  ): Promise<BoardingDecisionResult> {
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient not found');

    const timestamp = new Date();
    patient.decisionToAdmitTime = timestamp;
    patient.boardingStartTime = timestamp;
    patient.boardingStatus = 'boarding';
    patient.lastModifiedBy = clinicianId;
    patient.modifiedAt = timestamp;

    await patient.save();
    await this.notifyBedManagement(patientId);
    this.emit('decision_to_admit', { patientId, timestamp });

    return {
      patient,
      boardingStartTime: timestamp,
      clinicianId,
    };
  }

  async calculateBoardMetrics(): Promise<BoardingMetrics> {
    const boardingPatients = await Patient.find({
      boardingStartTime: { $ne: null },
      boardingStatus: 'boarding',
      current_state: { $nin: ['DISCHARGE', 'ADMISSION_COMPLETED'] },
    });

    const boardTimes = boardingPatients
      .map((patient) => this.boardMinutes(patient))
      .sort((a, b) => a - b);

    const medianBoardTime = boardTimes[Math.floor(boardTimes.length / 2)] || 0;
    const meanBoardTime =
      boardTimes.length > 0
        ? boardTimes.reduce((sum, value) => sum + value, 0) / boardTimes.length
        : 0;

    const patientsExceeding4Hours = boardingPatients.filter(
      (patient) => this.boardMinutes(patient) > this.WARNING_THRESHOLD,
    );
    const patientsExceeding6Hours = boardingPatients.filter(
      (patient) => this.boardMinutes(patient) > this.CRITICAL_THRESHOLD,
    );
    const patientsExceeding8Hours = boardingPatients.filter(
      (patient) => this.boardMinutes(patient) > this.SEVERE_THRESHOLD,
    );

    let benchmarkStatus: BoardingMetrics['benchmarkStatus'];
    if (medianBoardTime <= this.BENCHMARK_MINUTES) {
      benchmarkStatus = 'below_benchmark';
    } else if (medianBoardTime <= this.BENCHMARK_MINUTES * 1.1) {
      benchmarkStatus = 'at_benchmark';
    } else {
      benchmarkStatus = 'exceeds_benchmark';
    }

    return {
      medianBoardTime,
      meanBoardTime,
      patientsBoarding: boardingPatients.length,
      patientsExceeding4Hours,
      patientsExceeding6Hours,
      patientsExceeding8Hours,
      benchmarkStatus,
    };
  }

  async generateBoardReport(): Promise<BoardReport> {
    const metrics = await this.calculateBoardMetrics();
    let colorCode: BoardReport['colorCode'] = 'green';
    const recommendations: string[] = [];

    if (metrics.patientsExceeding6Hours.length > 0) {
      colorCode = 'red';
      recommendations.push('ESCALATE: Contact hospital administration immediately');
      recommendations.push('Consider ambulance diversion if multiple hospitals in network');
      recommendations.push('Activate hospital-wide discharge sweep');
    } else if (metrics.patientsExceeding4Hours.length > 3) {
      colorCode = 'orange';
      recommendations.push('URGENT: Boarding committee meeting required');
      recommendations.push('Identify same-day discharges for immediate release');
      recommendations.push('Request additional nursing resources for boarding area');
    } else if (metrics.patientsExceeding4Hours.length > 0) {
      colorCode = 'yellow';
      recommendations.push('Monitor boarding times closely');
      recommendations.push('Begin proactive bed management calls');
    } else {
      recommendations.push('Boarding times within benchmark');
    }

    if (metrics.medianBoardTime > this.BENCHMARK_MINUTES) {
      recommendations.push(
        `Median board time ${Math.round(metrics.medianBoardTime)} minutes exceeds ${this.BENCHMARK_MINUTES} minute benchmark`,
      );
    }

    recommendations.push('Conduct midday reverse triage sweep to identify discharges');

    return {
      timestamp: new Date(),
      metrics,
      recommendations,
      colorCode,
    };
  }

  async getBoardedPatients(): Promise<IPatient[]> {
    return Patient.find({
      boardingStartTime: { $ne: null },
      boardingStatus: 'boarding',
    }).sort({ boardingStartTime: 1 });
  }

  private boardMinutes(patient: IPatient): number {
    if (!patient.boardingStartTime) return 0;
    return Math.floor((Date.now() - patient.boardingStartTime.getTime()) / 60000);
  }

  // TODO(backend): no real delivery channel wired up yet — this is a standalone
  // EventEmitter singleton (not NestJS-DI-managed), so it can't currently take a
  // constructor-injected NotificationService/CollaborationHubService the way the
  // modules/* services do. Both this log and the 'decision_to_admit' event below have
  // zero subscribers today; bed management is not actually notified of new boarders.
  private async notifyBedManagement(patientId: string): Promise<void> {
    const patient = await Patient.findById(patientId);
    if (!patient) return;
    logger.warn(
      `Patient ${patient.name} (${patientId}) requires admission — bed management notification not yet wired up`,
    );
  }
}

export const boardingService = new BoardingService();
