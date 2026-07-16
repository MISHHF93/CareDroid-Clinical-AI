/**
 * Cycle 67 — per-family lazy loaders for specialty calculators.
 *
 * Specialty modules are already code-split via vite manualChunks, but Calculators.tsx
 * used to statically import every family, so selecting the calculators route still
 * downloaded/executed the full specialty catalog. These React.lazy wrappers load a
 * family only when a calculator from that family is first rendered.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Specialty calculators use varied prop shapes; keep the lazy registry loosely typed.
 
type AnyCalc = ComponentType<any>;
type LazyCalc = LazyExoticComponent<AnyCalc>;

function lazyExport(loader: () => Promise<any>, exportName: string): LazyCalc {
  return lazy(async () => {
    const mod = await loader();
    const Comp = mod[exportName] as AnyCalc | undefined;
    if (!Comp) {
      throw new Error(`Calculator export "${exportName}" missing from specialty module`);
    }
    return { default: Comp };
  });
}

// Mental health
export const Phq9Calculator = lazyExport(() => import('./mentalHealthCalculators'), 'Phq9Calculator');
export const Gad7Calculator = lazyExport(() => import('./mentalHealthCalculators'), 'Gad7Calculator');

// PR4 / PR8 batches
export const AscvdRiskCalculator = lazyExport(() => import('./pr4aCalculators'), 'AscvdRiskCalculator');
export const AuditCCalculator = lazyExport(() => import('./pr4aCalculators'), 'AuditCCalculator');
export const CkdStagingCalculator = lazyExport(() => import('./pr4aCalculators'), 'CkdStagingCalculator');
export const StopBangCalculator = lazyExport(() => import('./pr4aCalculators'), 'StopBangCalculator');

export const HeartScoreCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'HeartScoreCalculator');
export const CentorMcisaacCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'CentorMcisaacCalculator');
export const BishopScoreCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'BishopScoreCalculator');
export const ApgarScoreCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'ApgarScoreCalculator');
export const BradenScaleCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'BradenScaleCalculator');
export const MorseFallScaleCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'MorseFallScaleCalculator');
export const RansonCriteriaCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'RansonCriteriaCalculator');
export const BisapScoreCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'BisapScoreCalculator');
export const Fib4Calculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'Fib4Calculator');
export const FraminghamRiskCalculator = lazyExport(() => import('./pr8ClinicalBatchCalculators'), 'FraminghamRiskCalculator');

// Hepatology / GI
export const ApriCalculator = lazyExport(() => import('./hepatologyGiCalculators'), 'ApriCalculator');
export const GlasgowBlatchfordScoreCalculator = lazyExport(
  () => import('./hepatologyGiCalculators'),
  'GlasgowBlatchfordScoreCalculator',
);
export const MaddreyDiscriminantFunctionCalculator = lazyExport(
  () => import('./hepatologyGiCalculators'),
  'MaddreyDiscriminantFunctionCalculator',
);
export const RockallScoreCalculator = lazyExport(() => import('./hepatologyGiCalculators'), 'RockallScoreCalculator');

export const Abcd2Calculator = lazyExport(() => import('./abcd2Calculator'), 'Abcd2Calculator');

export const AnionGapCalculator = lazyExport(() => import('./nextWaveCalculators'), 'AnionGapCalculator');
export const RassCalculator = lazyExport(() => import('./nextWaveCalculators'), 'RassCalculator');
export const ShockIndexCalculator = lazyExport(() => import('./nextWaveCalculators'), 'ShockIndexCalculator');

// Source-backed
export const CanadianCSpineCalculator = lazyExport(
  () => import('./sourceBackedClinicalCalculators'),
  'CanadianCSpineCalculator',
);
export const GraceAcsCalculator = lazyExport(() => import('./sourceBackedClinicalCalculators'), 'GraceAcsCalculator');
export const NihssCalculator = lazyExport(() => import('./sourceBackedClinicalCalculators'), 'NihssCalculator');
export const OttawaAnkleCalculator = lazyExport(
  () => import('./sourceBackedClinicalCalculators'),
  'OttawaAnkleCalculator',
);
export const PercCalculator = lazyExport(() => import('./sourceBackedClinicalCalculators'), 'PercCalculator');
export const WellsPeCalculator = lazyExport(() => import('./sourceBackedClinicalCalculators'), 'WellsPeCalculator');

// Emergency critical care
export const ApacheIICalculator = lazyExport(
  () => import('./emergencyCriticalCareCalculators'),
  'ApacheIICalculator',
);
export const Curb65Calculator = lazyExport(() => import('./emergencyCriticalCareCalculators'), 'Curb65Calculator');
export const GcsCalculator = lazyExport(() => import('./emergencyCriticalCareCalculators'), 'GcsCalculator');
export const MewsCalculator = lazyExport(() => import('./emergencyCriticalCareCalculators'), 'MewsCalculator');
export const PewsCalculator = lazyExport(() => import('./emergencyCriticalCareCalculators'), 'PewsCalculator');
export const RevisedTraumaScoreCalculator = lazyExport(
  () => import('./emergencyCriticalCareCalculators'),
  'RevisedTraumaScoreCalculator',
);

// Cardiology
export const Chads2Calculator = lazyExport(() => import('./cardiologyCalculators'), 'Chads2Calculator');
export const DukeTreadmillScoreCalculator = lazyExport(
  () => import('./cardiologyCalculators'),
  'DukeTreadmillScoreCalculator',
);
export const HcmSuddenDeathRiskCalculator = lazyExport(
  () => import('./cardiologyCalculators'),
  'HcmSuddenDeathRiskCalculator',
);
export const HeartFailureStagingCalculator = lazyExport(
  () => import('./cardiologyCalculators'),
  'HeartFailureStagingCalculator',
);
export const ReynoldsRiskScoreCalculator = lazyExport(
  () => import('./cardiologyCalculators'),
  'ReynoldsRiskScoreCalculator',
);

// Pulmonology
export const AaGradientCalculator = lazyExport(() => import('./pulmonologyCalculators'), 'AaGradientCalculator');
export const AsthmaSeverityScoreCalculator = lazyExport(
  () => import('./pulmonologyCalculators'),
  'AsthmaSeverityScoreCalculator',
);
export const BodeIndexCalculator = lazyExport(() => import('./pulmonologyCalculators'), 'BodeIndexCalculator');
export const CopdGoldAssessmentCalculator = lazyExport(
  () => import('./pulmonologyCalculators'),
  'CopdGoldAssessmentCalculator',
);
export const Pao2Fio2RatioCalculator = lazyExport(() => import('./pulmonologyCalculators'), 'Pao2Fio2RatioCalculator');
export const PneumoniaSeverityIndexCalculator = lazyExport(
  () => import('./pulmonologyCalculators'),
  'PneumoniaSeverityIndexCalculator',
);
export const RoxIndexCalculator = lazyExport(() => import('./pulmonologyCalculators'), 'RoxIndexCalculator');

// Nephrology
export const BunCreatinineRatioCalculator = lazyExport(
  () => import('./nephrologyCalculators'),
  'BunCreatinineRatioCalculator',
);
export const CorrectedSodiumCalculator = lazyExport(
  () => import('./nephrologyCalculators'),
  'CorrectedSodiumCalculator',
);
export const CreatinineClearanceCgCalculator = lazyExport(
  () => import('./nephrologyCalculators'),
  'CreatinineClearanceCgCalculator',
);
export const EgfrCkdEpiCalculator = lazyExport(() => import('./nephrologyCalculators'), 'EgfrCkdEpiCalculator');
export const FeNaCalculator = lazyExport(() => import('./nephrologyCalculators'), 'FeNaCalculator');
export const FeUreaCalculator = lazyExport(() => import('./nephrologyCalculators'), 'FeUreaCalculator');
export const FreeWaterDeficitCalculator = lazyExport(
  () => import('./nephrologyCalculators'),
  'FreeWaterDeficitCalculator',
);
export const KfreCalculator = lazyExport(() => import('./nephrologyCalculators'), 'KfreCalculator');
export const OsmolalGapCalculator = lazyExport(() => import('./nephrologyCalculators'), 'OsmolalGapCalculator');

// Endocrine / metabolic
export const AdjustedBodyWeightCalculator = lazyExport(
  () => import('./endocrineMetabolicCalculators'),
  'AdjustedBodyWeightCalculator',
);
export const BsaCalculator = lazyExport(() => import('./endocrineMetabolicCalculators'), 'BsaCalculator');
export const CorrectedCalciumCalculator = lazyExport(
  () => import('./endocrineMetabolicCalculators'),
  'CorrectedCalciumCalculator',
);
export const HomaIrCalculator = lazyExport(() => import('./endocrineMetabolicCalculators'), 'HomaIrCalculator');
export const IdealBodyWeightCalculator = lazyExport(
  () => import('./endocrineMetabolicCalculators'),
  'IdealBodyWeightCalculator',
);
export const SerumOsmolalityCalculator = lazyExport(
  () => import('./endocrineMetabolicCalculators'),
  'SerumOsmolalityCalculator',
);
export const WaistHipRatioCalculator = lazyExport(
  () => import('./endocrineMetabolicCalculators'),
  'WaistHipRatioCalculator',
);

// Neurology
export const FourScoreCalculator = lazyExport(() => import('./neurologyCalculators'), 'FourScoreCalculator');
export const HuntHessScaleCalculator = lazyExport(() => import('./neurologyCalculators'), 'HuntHessScaleCalculator');
export const IchScoreCalculator = lazyExport(() => import('./neurologyCalculators'), 'IchScoreCalculator');
export const ModifiedRankinScaleCalculator = lazyExport(
  () => import('./neurologyCalculators'),
  'ModifiedRankinScaleCalculator',
);
export const NihssSummaryViewCalculator = lazyExport(
  () => import('./neurologyCalculators'),
  'NihssSummaryViewCalculator',
);
export const PediatricGcsCalculator = lazyExport(() => import('./neurologyCalculators'), 'PediatricGcsCalculator');

// Pediatrics / OB
export const FentonGrowthChartHelper = lazyExport(
  () => import('./pediatricsObgynCalculators'),
  'FentonGrowthChartHelper',
);
export const GestationalAgeCalculator = lazyExport(
  () => import('./pediatricsObgynCalculators'),
  'GestationalAgeCalculator',
);
export const NeonatalBilirubinRiskHelper = lazyExport(
  () => import('./pediatricsObgynCalculators'),
  'NeonatalBilirubinRiskHelper',
);
export const PediatricBpPercentileCalculator = lazyExport(
  () => import('./pediatricsObgynCalculators'),
  'PediatricBpPercentileCalculator',
);
export const PediatricDoseSafetyChecker = lazyExport(
  () => import('./pediatricsObgynCalculators'),
  'PediatricDoseSafetyChecker',
);
export const PregnancyDueDateCalculator = lazyExport(
  () => import('./pediatricsObgynCalculators'),
  'PregnancyDueDateCalculator',
);

// Psychiatry screening
export const CageCalculator = lazyExport(() => import('./psychiatryScreeningCalculators'), 'CageCalculator');
export const ColumbiaSuicideSeverityWorkflow = lazyExport(
  () => import('./psychiatryScreeningCalculators'),
  'ColumbiaSuicideSeverityWorkflow',
);
export const EpworthSleepinessScaleCalculator = lazyExport(
  () => import('./psychiatryScreeningCalculators'),
  'EpworthSleepinessScaleCalculator',
);
export const MdqCalculator = lazyExport(() => import('./psychiatryScreeningCalculators'), 'MdqCalculator');
export const MmseCalculator = lazyExport(() => import('./psychiatryScreeningCalculators'), 'MmseCalculator');
export const MocaPlaceholderWorkflow = lazyExport(
  () => import('./psychiatryScreeningCalculators'),
  'MocaPlaceholderWorkflow',
);
export const Pcl5Calculator = lazyExport(() => import('./psychiatryScreeningCalculators'), 'Pcl5Calculator');

// Hospital ops
export const BedOccupancyCalculator = lazyExport(
  () => import('./hospitalOperationsCalculators'),
  'BedOccupancyCalculator',
);
export const ResourceUtilizationIndexCalculator = lazyExport(
  () => import('./hospitalOperationsCalculators'),
  'ResourceUtilizationIndexCalculator',
);
export const StaffingRatioCalculator = lazyExport(
  () => import('./hospitalOperationsCalculators'),
  'StaffingRatioCalculator',
);
export const TurnaroundTimeCalculator = lazyExport(
  () => import('./hospitalOperationsCalculators'),
  'TurnaroundTimeCalculator',
);
