import { Injectable } from '@nestjs/common';

export interface EDState {
  timestamp?: string;
  census: number;
  waitingPatients: number;
  boardingPatients: number;
  staffedBeds: number;
  nurses: number;
  physicians: number;
  arrivalsPerHour: number;
}

export interface VirtualRepresentation {
  currentCensus: number;
  activePatients: Array<{
    id: string;
    acuity: 'high' | 'medium' | 'low';
    state: string;
    waitMinutes: number;
  }>;
  predictedNextState: {
    census: number;
    waitingPatients: number;
    boardingPatients: number;
    capacityPressure: number;
    generatedAt: string;
  };
}

export interface SimulationForecast {
  censusForecast: Array<{ hour: number; value: number }>;
  waitTimeForecast: Array<{ hour: number; minutes: number }>;
  resourceUtilization: Array<{ hour: number; utilization: number }>;
  confidenceIntervals: {
    census: Array<{ hour: number; low: number; high: number }>;
    waitMinutes: Array<{ hour: number; low: number; high: number }>;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

@Injectable()
export class OrganizationalDigitalTwin {
  private readonly historicalState: EDState = {
    census: 42,
    waitingPatients: 11,
    boardingPatients: 5,
    staffedBeds: 38,
    nurses: 14,
    physicians: 5,
    arrivalsPerHour: 7,
  };

  private currentState: EDState = { ...this.historicalState };

  async synchronizePatientFlow(realTimeData: Partial<EDState>): Promise<VirtualRepresentation> {
    const enrichedState = await this.fuseDataWithHistorical(realTimeData);
    this.currentState = enrichedState;

    return {
      currentCensus: enrichedState.census,
      activePatients: this.buildVirtualPatients(enrichedState),
      predictedNextState: await this.predictNextState(enrichedState),
    };
  }

  async runPredictiveSimulation(scenario: string): Promise<SimulationForecast> {
    const currentState = await this.captureCurrentState();
    const forecast = await this.simulateScenario(currentState, scenario);

    return {
      censusForecast: forecast.censusByHour,
      waitTimeForecast: forecast.waitTimes,
      resourceUtilization: forecast.utilization,
      confidenceIntervals: forecast.cis,
    };
  }

  private async fuseDataWithHistorical(realTimeData: Partial<EDState>): Promise<EDState> {
    const weighted = (live: number | undefined, historical: number) =>
      live === undefined ? historical : round(live * 0.72 + historical * 0.28);

    return {
      timestamp: realTimeData.timestamp || new Date().toISOString(),
      census: weighted(realTimeData.census, this.historicalState.census),
      waitingPatients: weighted(realTimeData.waitingPatients, this.historicalState.waitingPatients),
      boardingPatients: weighted(
        realTimeData.boardingPatients,
        this.historicalState.boardingPatients,
      ),
      staffedBeds: weighted(realTimeData.staffedBeds, this.historicalState.staffedBeds),
      nurses: weighted(realTimeData.nurses, this.historicalState.nurses),
      physicians: weighted(realTimeData.physicians, this.historicalState.physicians),
      arrivalsPerHour: weighted(realTimeData.arrivalsPerHour, this.historicalState.arrivalsPerHour),
    };
  }

  private async predictNextState(
    state: EDState,
  ): Promise<VirtualRepresentation['predictedNextState']> {
    const throughput = state.physicians * 2.2 + state.nurses * 0.42;
    const boardingDrag = state.boardingPatients * 0.24;
    const census = clamp(state.census + state.arrivalsPerHour - throughput + boardingDrag, 0, 220);
    const waitingPatients = clamp(
      state.waitingPatients + state.arrivalsPerHour * 0.45 - throughput * 0.28,
      0,
      220,
    );
    const boardingPatients = clamp(
      state.boardingPatients + state.census * 0.02 - throughput * 0.05,
      0,
      80,
    );
    const capacityPressure = clamp(
      (census / Math.max(state.staffedBeds, 1)) * 72 + boardingPatients * 2.8,
      0,
      100,
    );

    return {
      census: round(census),
      waitingPatients: round(waitingPatients),
      boardingPatients: round(boardingPatients),
      capacityPressure: round(capacityPressure),
      generatedAt: new Date().toISOString(),
    };
  }

  private async captureCurrentState(): Promise<EDState> {
    return { ...this.currentState, timestamp: new Date().toISOString() };
  }

  private async simulateScenario(
    state: EDState,
    scenario: string,
  ): Promise<{
    censusByHour: Array<{ hour: number; value: number }>;
    waitTimes: Array<{ hour: number; minutes: number }>;
    utilization: Array<{ hour: number; utilization: number }>;
    cis: SimulationForecast['confidenceIntervals'];
  }> {
    const normalizedScenario = scenario.toLowerCase();
    const intervention =
      normalizedScenario.includes('fast') || normalizedScenario.includes('split')
        ? { throughputBoost: 3.5, arrivalReduction: 0, bedBoost: 2 }
        : normalizedScenario.includes('staff')
          ? { throughputBoost: 5, arrivalReduction: 0, bedBoost: 4 }
          : normalizedScenario.includes('diversion')
            ? { throughputBoost: 0, arrivalReduction: 2.5, bedBoost: 0 }
            : { throughputBoost: 0, arrivalReduction: 0, bedBoost: 0 };

    const censusByHour: Array<{ hour: number; value: number }> = [];
    const waitTimes: Array<{ hour: number; minutes: number }> = [];
    const utilization: Array<{ hour: number; utilization: number }> = [];
    const censusIntervals: Array<{ hour: number; low: number; high: number }> = [];
    const waitIntervals: Array<{ hour: number; low: number; high: number }> = [];

    for (let hour = 0; hour <= 8; hour += 1) {
      const throughput =
        (state.physicians * 2.2 + state.nurses * 0.42 + intervention.throughputBoost) * hour;
      const arrivals = Math.max(0, state.arrivalsPerHour - intervention.arrivalReduction) * hour;
      const boardingDrag = state.boardingPatients * hour * 0.22;
      const census = clamp(state.census + arrivals - throughput + boardingDrag, 0, 220);
      const staffedBeds = state.staffedBeds + intervention.bedBoost;
      const utilizationValue = clamp((census / Math.max(staffedBeds, 1)) * 100, 0, 100);
      const waitMinutes = clamp(
        22 + utilizationValue * 0.7 + Math.max(0, census - staffedBeds) * 2.8,
        5,
        360,
      );

      censusByHour.push({ hour, value: round(census) });
      waitTimes.push({ hour, minutes: round(waitMinutes) });
      utilization.push({ hour, utilization: round(utilizationValue) });
      censusIntervals.push({
        hour,
        low: round(Math.max(0, census - 4 - hour)),
        high: round(census + 5 + hour),
      });
      waitIntervals.push({
        hour,
        low: round(Math.max(0, waitMinutes - 8 - hour * 1.5)),
        high: round(waitMinutes + 9 + hour * 1.8),
      });
    }

    return {
      censusByHour,
      waitTimes,
      utilization,
      cis: { census: censusIntervals, waitMinutes: waitIntervals },
    };
  }

  private buildVirtualPatients(state: EDState): VirtualRepresentation['activePatients'] {
    const count = Math.min(12, Math.max(3, Math.round(state.census / 5)));
    return Array.from({ length: count }, (_, index) => ({
      id: `virtual-ed-${index + 1}`,
      acuity:
        index < Math.max(1, Math.round(count * 0.18)) ? 'high' : index % 3 === 0 ? 'medium' : 'low',
      state:
        index < state.waitingPatients / 3
          ? 'waiting'
          : index < state.boardingPatients / 2
            ? 'boarding'
            : 'treatment',
      waitMinutes: Math.round(12 + index * 7 + (state.waitingPatients / Math.max(count, 1)) * 4),
    }));
  }
}

export const organizationalDigitalTwin = new OrganizationalDigitalTwin();
