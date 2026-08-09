import { Injectable } from '@nestjs/common';
import {
  addStructuredTriageRule,
  buildClinicalAcuityLeaderboard,
  buildContinualLearningSummary,
  buildNativeAiDriftEvaluations,
  buildOperationalDriftReport,
  getDriftPerformanceHistory,
  inferTriageFromExpertSystem,
  listRegisteredModels,
  listRetrainingAlerts,
  listStructuredTriageRules,
  parseNaturalLanguageTriageRule,
  routePatientToClinicalSpecialists,
  runRoutedSpecialistPanel,
  runWeeklyNativeAiDriftEvaluation,
} from '../../../../lib/native-ai';
import type { Patient } from '../../../../src/types/emergency';

/**
 * routePatientToClinicalSpecialists/runRoutedSpecialistPanel/
 * inferTriageFromExpertSystem are hand-coded heuristic formulas (keyword
 * matching + vitals thresholds; zero ML/LLM) that already default their own
 * sourceState to the honest 'demo' label. 2026-08-09: this service used to
 * override that default with a hardcoded sourceState: 'live' at every call
 * site here, mislabeling unvalidated heuristics as real live inference for
 * every consumer of these endpoints. Removed -- let each function's own
 * honest default stand, matching the equivalent fix already applied to the
 * frontend orchestrator (src/services/nativeAiCore.ts).
 */
@Injectable()
export class NativeAiService {
  getRegistrySummary() {
    return {
      module: 'Native AI Registry',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: {
        models: listRegisteredModels(),
        continualLearning: buildContinualLearningSummary(),
      },
      remainingGaps: ['Production model serving and GPU inference endpoints not yet wired'],
    };
  }

  routePatient(patient: Patient) {
    const routing = routePatientToClinicalSpecialists(patient);
    return {
      module: 'Native AI Router',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: routing,
      remainingGaps: [],
    };
  }

  getClinicalAcuity(patients: Patient[]) {
    return {
      module: 'Clinical Acuity Leaderboard',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: buildClinicalAcuityLeaderboard(patients),
      remainingGaps: [],
    };
  }

  evaluateDrift() {
    const report = runWeeklyNativeAiDriftEvaluation();
    return {
      module: 'Native AI Drift Monitoring',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: report,
      remainingGaps: ['Scheduled weekly cron and production telemetry ingestion pending'],
    };
  }

  getDriftEnvelope() {
    const report = buildOperationalDriftReport(buildNativeAiDriftEvaluations());
    return {
      module: 'Native AI Drift Monitoring',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: {
        ...report,
        performanceHistory: getDriftPerformanceHistory(),
        retrainingAlerts: listRetrainingAlerts(),
        continualLearning: buildContinualLearningSummary(),
      },
      remainingGaps: [],
    };
  }

  listTriageRules() {
    return {
      module: 'NLP Triage Expert System',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: listStructuredTriageRules(),
      remainingGaps: [],
    };
  }

  addTriageRule(naturalLanguage: string, createdBy?: string) {
    const rule = parseNaturalLanguageTriageRule(naturalLanguage, { createdBy });
    addStructuredTriageRule(rule);
    return {
      module: 'NLP Triage Expert System',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: rule,
      remainingGaps: [],
    };
  }

  evaluateTriage(patient: Patient) {
    const inference = inferTriageFromExpertSystem(patient);
    return {
      module: 'NLP Triage Expert System',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: inference,
      remainingGaps: [],
    };
  }

  inferSpecialists(patient: Patient) {
    const routing = routePatientToClinicalSpecialists(patient);
    const inferences = runRoutedSpecialistPanel(patient, routing.specialistDomains, {
      routingConfidence: routing.confidence,
    });
    return {
      module: 'Clinical Domain Specialists',
      generatedAt: new Date().toISOString(),
      source: 'native-ai-core',
      status: 'active',
      data: { routing, specialistInferences: inferences },
      remainingGaps: [],
    };
  }
}
