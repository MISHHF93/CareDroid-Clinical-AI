import { Patient } from '../models/Patient';

interface CapacityMetrics {
  active_patients: number;
  waiting_patients: number;
  patients_in_assessment: number;
  pending_discharges: number;
  ems_inbound_45min: number;
  admissions_pending: number;
  ctas2_waiting_count: number;
  ctas3_waiting_count: number;
  boarding_patients: number;
}

interface CapacityResponse {
  score: number;
  color: 'Green' | 'Yellow' | 'Orange' | 'Red';
  triggers: string[];
  recommendations: string[];
  metrics: CapacityMetrics;
  timestamp: Date;
}

export class CapacityService {
  private theoretical_max = 25; // Configurable per site

  async getCapacityDashboard(): Promise<CapacityResponse> {
    const metrics = await this.gatherMetrics();
    const score = this.calculateWeightedScore(metrics);
    const color = this.determineColor(score, metrics);
    const triggers = this.identifyTriggers(metrics);
    const recommendations = this.generateRecommendations(triggers, metrics);

    return {
      score,
      color,
      triggers,
      recommendations,
      metrics,
      timestamp: new Date(),
    };
  }

  private async gatherMetrics(): Promise<CapacityMetrics> {
    const [
      active_patients,
      waiting_patients,
      patients_in_assessment,
      pending_discharges,
      ems_inbound_45min,
      ctas2_waiting,
      ctas3_waiting,
      boarding_patients,
    ] = await Promise.all([
      Patient.countDocuments({ current_state: { $nin: ['DISCHARGE'] } }),
      Patient.countDocuments({ current_state: 'WAITING' }),
      Patient.countDocuments({ current_state: 'ASSESSMENT' }),
      Patient.countDocuments({ current_state: 'DISPOSITION' }),
      Patient.countDocuments({
        ems_status: 'en_route',
        eta_minutes: { $lte: 45 },
      }),
      Patient.countDocuments({
        current_state: 'WAITING',
        triage_code: 'CTAS2',
      }),
      Patient.countDocuments({
        current_state: 'WAITING',
        triage_code: 'CTAS3',
      }),
      Patient.countDocuments({
        current_state: 'ADMISSION',
      }),
    ]);

    return {
      active_patients,
      waiting_patients,
      patients_in_assessment,
      pending_discharges,
      ems_inbound_45min,
      ctas2_waiting_count: ctas2_waiting,
      ctas3_waiting_count: ctas3_waiting,
      admissions_pending: boarding_patients,
      boarding_patients,
    };
  }

  private calculateWeightedScore(metrics: CapacityMetrics): number {
    const activeScore = (metrics.active_patients / this.theoretical_max) * 0.4;
    const waitingScore = Math.min(metrics.waiting_patients / 15, 1) * 0.3;
    const dischargeScore = Math.min(metrics.pending_discharges / 5, 1) * 0.2;
    const emsScore = Math.min(metrics.ems_inbound_45min / 3, 1) * 0.1;

    return Number((activeScore + waitingScore + dischargeScore + emsScore).toFixed(2));
  }

  private determineColor(score: number, metrics: CapacityMetrics): CapacityResponse['color'] {
    // Override triggers first
    if (metrics.ctas2_waiting_count > 6 || metrics.admissions_pending > 8) {
      return 'Red';
    }
    if (metrics.ctas2_waiting_count > 4 || metrics.ctas3_waiting_count > 15) {
      return 'Orange';
    }
    if (metrics.ctas2_waiting_count > 3 || metrics.admissions_pending > 4) {
      return 'Yellow';
    }

    // Then use score
    if (score <= 0.3) return 'Green';
    if (score <= 0.5) return 'Yellow';
    if (score <= 0.7) return 'Orange';
    return 'Red';
  }

  private identifyTriggers(metrics: CapacityMetrics): string[] {
    const triggers: string[] = [];

    if (metrics.ctas2_waiting_count > 3) {
      triggers.push(`CTAS2 patients waiting: ${metrics.ctas2_waiting_count}`);
    }
    if (metrics.ctas3_waiting_count > 15) {
      triggers.push(`CTAS3 patients waiting: ${metrics.ctas3_waiting_count}`);
    }
    if (metrics.admissions_pending > 4) {
      triggers.push(`Boarding patients: ${metrics.admissions_pending}`);
    }
    if (metrics.ems_inbound_45min > 3) {
      triggers.push(`EMS inbound (45min): ${metrics.ems_inbound_45min}`);
    }
    if (metrics.waiting_patients > 10) {
      triggers.push(`Total waiting: ${metrics.waiting_patients}`);
    }

    return triggers;
  }

  private generateRecommendations(triggers: string[], metrics: CapacityMetrics): string[] {
    const recommendations: string[] = [];

    if (triggers.some((trigger) => trigger.includes('CTAS2'))) {
      recommendations.push('Immediate physician assessment needed for CTAS2 waiting patients');
    }
    if (triggers.some((trigger) => trigger.includes('CTAS3'))) {
      recommendations.push('Consider fast-track for CTAS3 patients');
    }
    if (triggers.some((trigger) => trigger.includes('Boarding'))) {
      recommendations.push('Expedite admissions process, contact bed management');
    }
    if (triggers.some((trigger) => trigger.includes('EMS'))) {
      recommendations.push('Prepare for multiple EMS arrivals, consider diversion if Red');
    }
    if (metrics.pending_discharges > 3) {
      recommendations.push(`${metrics.pending_discharges} patients ready for discharge - prioritize transport`);
    }

    return recommendations;
  }
}

export const capacityService = new CapacityService();
