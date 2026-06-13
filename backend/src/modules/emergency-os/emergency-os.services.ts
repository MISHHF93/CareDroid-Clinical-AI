import { Injectable } from '@nestjs/common';
import {
  emergencyAlertsFixture,
  emergencyPatientsFixture,
  emergencyRoomsFixture,
  emergencyStaffFixture,
} from './emergency-os.fixtures';
import type {
  CapacitySnapshot,
  EmergencyAlert,
  EmergencyModuleEnvelope,
  EmergencyPatient,
  EmergencyRoom,
  EmergencyStaff,
} from './emergency-os.types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function minutesSince(timestamp: string): number {
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
}

function isHighRisk(patient: EmergencyPatient): boolean {
  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    patient.flags.some((flag) => ['HighRisk', 'DeteriorationRisk', 'SepsisAlert'].includes(flag))
  );
}

function isBoarding(patient: EmergencyPatient): boolean {
  return (
    patient.state === 'Admission' ||
    patient.state === 'Disposition' ||
    patient.flags.includes('PendingAdmission')
  );
}

function envelope<T>(
  module: string,
  data: T,
  remainingGaps: string[] = [],
): EmergencyModuleEnvelope<T> {
  return {
    module,
    generatedAt: new Date().toISOString(),
    source: 'backend-fixture',
    status: remainingGaps.length ? 'placeholder' : 'active',
    data,
    remainingGaps,
  };
}

@Injectable()
export class EmergencyPatientService {
  private readonly patients: EmergencyPatient[] = clone(emergencyPatientsFixture);
  private readonly rooms: EmergencyRoom[] = clone(emergencyRoomsFixture);
  private readonly staff: EmergencyStaff[] = clone(emergencyStaffFixture);
  private readonly alerts: EmergencyAlert[] = clone(emergencyAlertsFixture);

  listPatients(): EmergencyPatient[] {
    return clone(this.patients);
  }

  listRooms(): EmergencyRoom[] {
    return clone(this.rooms);
  }

  listStaff(): EmergencyStaff[] {
    return clone(this.staff);
  }

  listAlerts(): EmergencyAlert[] {
    return clone(this.alerts);
  }

  createPatient(input: Partial<EmergencyPatient>): EmergencyPatient {
    const now = new Date().toISOString();
    const priority = input.priority || 'P3';
    const patient: EmergencyPatient = {
      id: input.id || createId('patient'),
      mrn: input.mrn || `ED-${Math.floor(100000 + Math.random() * 900000)}`,
      firstName: input.firstName || 'Unknown',
      lastName: input.lastName || 'Patient',
      dob: input.dob || now.slice(0, 10),
      age: Number.isFinite(input.age) ? Number(input.age) : 0,
      sex: input.sex || 'Other',
      arrivalTime: input.arrivalTime || now,
      triageTime: input.triageTime || now,
      chiefComplaint: input.chiefComplaint || 'Unspecified complaint',
      complaintCategory: input.complaintCategory || 'Other',
      state: input.state || 'Triage',
      priority,
      vitals: input.vitals || [],
      flags: input.flags || (priority === 'P1' || priority === 'P2' ? ['HighRisk'] : []),
      assignedStaffId: input.assignedStaffId,
      roomId: input.roomId,
      notes: input.notes || [],
      timeline: input.timeline || [
        {
          id: createId('journey'),
          to: input.state || 'Triage',
          timestamp: now,
          staffId: 'intake',
          note: 'Created through Smart Intake.',
        },
      ],
    };
    this.patients.push(patient);
    return clone(patient);
  }

  computeCapacity(): CapacitySnapshot {
    const occupiedRooms = this.rooms.filter((room) => room.status === 'Occupied').length;
    const boardingCount = this.patients.filter(isBoarding).length;
    const reassessmentDue = this.patients.filter((patient) =>
      patient.flags.includes('ReassessmentDue'),
    ).length;
    const score = Math.min(
      100,
      Math.round(
        (occupiedRooms / Math.max(this.rooms.length, 1)) * 65 +
          boardingCount * 6 +
          reassessmentDue * 4,
      ),
    );
    const band: CapacitySnapshot['band'] =
      score >= 85 ? 'Red' : score >= 70 ? 'Orange' : score >= 50 ? 'Yellow' : 'Green';
    return {
      score,
      band,
      totalPatients: this.patients.length,
      occupiedRooms,
      boardingCount,
      reassessmentDue,
      updatedAt: new Date().toISOString(),
    };
  }

  getPatientEnvelope(): EmergencyModuleEnvelope<{
    patients: EmergencyPatient[];
    staff: EmergencyStaff[];
    alerts: EmergencyAlert[];
  }> {
    return envelope('Patients', {
      patients: this.listPatients(),
      staff: this.listStaff(),
      alerts: this.listAlerts(),
    });
  }
}

@Injectable()
export class EmergencyWhiteboardService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getWhiteboard() {
    return envelope('Emergency Whiteboard', {
      patients: this.patientService.listPatients(),
      rooms: this.patientService.listRooms(),
      staff: this.patientService.listStaff(),
      alerts: this.patientService.listAlerts(),
      capacity: this.patientService.computeCapacity(),
    });
  }
}

@Injectable()
export class PatientJourneyService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getJourney() {
    const patients = this.patientService.listPatients();
    return envelope('Patient Journey Engine', {
      events: patients.flatMap((patient) =>
        patient.timeline.map((event) => ({
          ...event,
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`.trim(),
          currentState: patient.state,
        })),
      ),
      stateCounts: patients.reduce<Record<string, number>>((counts, patient) => {
        counts[patient.state] = (counts[patient.state] || 0) + 1;
        return counts;
      }, {}),
    });
  }
}

@Injectable()
export class EMSIntakeService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getEMSIntake() {
    const patients = this.patientService
      .listPatients()
      .filter(
        (patient) =>
          patient.flags.includes('EMSArrival') ||
          /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint),
      );
    return envelope('EMS Intake', {
      arrivals: patients.map((patient) => ({
        patient,
        etaMinutes: Math.max(1, 14 - minutesSince(patient.arrivalTime)),
        offloadRisk: isHighRisk(patient) ? 'high' : 'medium',
        handoffStatus: patient.state === 'Arrival' ? 'pre-arrival' : 'converted-to-patient',
      })),
      availableResusRooms: this.patientService
        .listRooms()
        .filter((room) => room.type === 'Resus' && room.status === 'Available').length,
    });
  }
}

@Injectable()
export class SmartIntakeService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getSmartIntake() {
    return envelope('Smart Intake', {
      mode: 'quick-intake',
      identityReview: [
        {
          id: 'provincial-unavailable',
          label: 'Provincial health lookup',
          status: 'unavailable',
          action: 'Continue with local MRN and manual review.',
        },
        {
          id: 'duplicate-check',
          label: 'Duplicate patient check',
          status: 'ready',
          action: 'Review candidate matches before chart merge.',
        },
      ],
      recentPatients: this.patientService.listPatients().slice(-3),
    });
  }

  createFromIntake(input: Partial<EmergencyPatient>) {
    const patient = this.patientService.createPatient(input);
    return envelope('Smart Intake', { patient });
  }
}

@Injectable()
export class QueueIntelligenceService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getQueues() {
    const patients = this.patientService.listPatients();
    const queueDefinitions = [
      ['Waiting', (patient: EmergencyPatient) => patient.state === 'Waiting', 30],
      ['Triage', (patient: EmergencyPatient) => patient.state === 'Triage', 10],
      ['Assessment', (patient: EmergencyPatient) => patient.state === 'Assessment', 45],
      ['Orders', (patient: EmergencyPatient) => patient.state === 'Orders', 60],
      ['Results', (patient: EmergencyPatient) => patient.state === 'Results', 90],
      [
        'Admission',
        (patient: EmergencyPatient) =>
          patient.state === 'Admission' || patient.flags.includes('PendingAdmission'),
        120,
      ],
      [
        'Reassessment',
        (patient: EmergencyPatient) => patient.flags.includes('ReassessmentDue'),
        30,
      ],
    ] as const;

    return envelope('Queue Intelligence', {
      queues: queueDefinitions.map(([label, predicate, targetMinutes]) => {
        const rows = patients.filter(predicate);
        const oldestWaitMinutes = rows.reduce(
          (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
          0,
        );
        return {
          id: label.toLowerCase(),
          label,
          targetMinutes,
          count: rows.length,
          oldestWaitMinutes,
          breached: oldestWaitMinutes > targetMinutes,
          patients: rows,
        };
      }),
    });
  }
}

@Injectable()
export class ReassessmentService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getReassessmentQueue() {
    const patients = this.patientService
      .listPatients()
      .filter((patient) => patient.flags.includes('ReassessmentDue'));
    return envelope('Reassessment Engine', {
      patients,
      overdueCount: patients.filter((patient) => minutesSince(patient.arrivalTime) > 45).length,
      nextAction: patients.length
        ? 'Recheck vitals and pain score before disposition changes.'
        : 'No reassessments due.',
    });
  }
}

@Injectable()
export class CapacityService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getCapacity() {
    return envelope('Capacity Intelligence', {
      capacity: this.patientService.computeCapacity(),
      rooms: this.patientService.listRooms(),
      recommendations: [
        'Protect resus availability for EMS stroke arrival.',
        'Expedite boarder handoff with inpatient bed desk.',
      ],
    });
  }
}

@Injectable()
export class BoardingService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getBoarding() {
    const patients = this.patientService.listPatients().filter(isBoarding);
    return envelope('Boarding Intelligence', {
      patients,
      longestBoardingMinutes: patients.reduce(
        (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
        0,
      ),
      escalation: patients.length
        ? 'Notify inpatient flow lead for pending admissions.'
        : 'No active boarding escalation.',
    });
  }
}

@Injectable()
export class ReferralService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getReferrals() {
    const patients = this.patientService
      .listPatients()
      .filter(
        (patient) => patient.state === 'Disposition' || isBoarding(patient) || isHighRisk(patient),
      );
    return envelope('Referral Intelligence', {
      referrals: patients.map((patient, index) => ({
        id: `ref-${patient.id}`,
        patient,
        specialty:
          patient.complaintCategory === 'Cardiac'
            ? 'Cardiology'
            : patient.complaintCategory === 'Mental Health'
              ? 'Psychiatry'
              : index % 2
                ? 'Internal Medicine'
                : 'Surgery',
        status: patient.flags.includes('PendingAdmission')
          ? 'accepted-waiting-bed'
          : 'review-needed',
        elapsedMinutes: minutesSince(patient.arrivalTime),
      })),
    });
  }
}

@Injectable()
export class ProvincialHealthService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getProvincialHealth() {
    return envelope(
      'Provincial Health Connector',
      {
        connectorStatus: 'placeholder-unavailable',
        jurisdiction: 'Ontario/OHIP demo placeholder',
        records: this.patientService
          .listPatients()
          .slice(0, 3)
          .map((patient) => ({
            patientId: patient.id,
            mrn: patient.mrn,
            medications: ['Medication history requires provincial/EHR connector review'],
            allergies: ['Allergy history requires provincial/EHR connector review'],
            recentEncounters: ['External encounter feed not connected'],
          })),
      },
      ['No production provincial credential, adapter, or HIE/OHIP feed is connected.'],
    );
  }
}

@Injectable()
export class IntegrationHubService {
  getIntegrationHub() {
    return envelope(
      'IoT/Integration Hub',
      {
        sources: [
          {
            id: 'fhir-demo',
            label: 'FHIR patient snapshot',
            status: 'demo-ready',
            lastEventAt: new Date().toISOString(),
          },
          { id: 'hl7-demo', label: 'HL7 ADT interface', status: 'placeholder', lastEventAt: null },
          {
            id: 'device-telemetry-demo',
            label: 'IoT vitals stream',
            status: 'placeholder',
            lastEventAt: null,
          },
        ],
        reviewQueue: [
          {
            id: 'integration-review-1',
            severity: 'Info',
            summary:
              'External feeds are labeled placeholders until live credentials are configured.',
          },
        ],
      },
      [
        'Live bedside monitor, MQTT/device gateway, HL7 MLLP, and provincial feeds remain future connectors.',
      ],
    );
  }
}

@Injectable()
export class EDCopilotService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getCopilotContext() {
    const patients = this.patientService.listPatients();
    return envelope('ED Copilot', {
      promptContext: {
        patientCount: patients.length,
        highRiskCount: patients.filter(isHighRisk).length,
        reassessmentCount: patients.filter((patient) => patient.flags.includes('ReassessmentDue'))
          .length,
        capacity: this.patientService.computeCapacity(),
        safetyRule: 'Human review required. Do not make autonomous clinical decisions.',
      },
      quickActions: ['Who needs attention?', 'Capacity status', 'EMS update', 'Reassessment queue'],
    });
  }
}

@Injectable()
export class EmergencyAnalyticsService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getAnalytics() {
    const patients = this.patientService.listPatients();
    const activePatients = patients.filter((patient) => patient.state !== 'Discharge');
    const waits = activePatients.map((patient) => minutesSince(patient.arrivalTime));
    const averageWaitMinutes = waits.length
      ? Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length)
      : 0;
    return envelope('Analytics', {
      activeCensus: activePatients.length,
      waiting: activePatients.filter((patient) => patient.state === 'Waiting').length,
      highRisk: activePatients.filter(isHighRisk).length,
      boarding: activePatients.filter(isBoarding).length,
      reassessmentDue: activePatients.filter((patient) => patient.flags.includes('ReassessmentDue'))
        .length,
      averageWaitMinutes,
      capacity: this.patientService.computeCapacity(),
    });
  }
}

@Injectable()
export class EmergencySettingsService {
  getSettings() {
    return envelope('Settings', {
      department: { name: 'CareDroid Emergency Department', timezone: 'America/Toronto' },
      thresholds: {
        reassessmentMinutes: 30,
        longWaitMinutes: 60,
        boardingEscalationMinutes: 180,
        capacityRedScore: 85,
      },
      enabledModules: [
        'Emergency Whiteboard',
        'Patients',
        'Patient Journey Engine',
        'EMS Intake',
        'Smart Intake',
        'Queue Intelligence',
        'Reassessment Engine',
        'Capacity Intelligence',
        'Boarding Intelligence',
        'Referral Intelligence',
        'Provincial Health Connector',
        'IoT/Integration Hub',
        'ED Copilot',
        'Analytics',
        'Settings',
      ],
    });
  }
}
