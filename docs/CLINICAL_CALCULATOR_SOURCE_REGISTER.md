# Clinical calculator source register (v1)

Built 2026-08-04 for release gate P0.3 ("Clinical release evidence" — signed
clinician review, platform hazard log/safety case, calculator source/version
register, approved intended-use boundary). This is the register piece:
every deterministic clinical calculator in this codebase, with the citation
already embedded in its own source file, extracted and consolidated into one
reviewable table so a clinician doesn't have to read source code to verify
provenance.

**Method:** every file under `src/utils/*Calculator*.ts` and
`src/utils/*Calculators.ts` was grepped directly for its doc-comment
citation. Nothing here is inferred or reconstructed from memory — each
`Reference:`/`referenceLine` string is copied verbatim from the named file.
Where a bundle file contains several distinct instruments, each is listed as
its own row. Two implementation gaps were found during this extraction and
are flagged explicitly below rather than silently omitted.

**Versioning:** none of these are ML models with a version number — they are
static, deterministic formula implementations of published clinical
instruments. "Version" for this register means *the published instrument
version cited* (e.g. "NEWS2" not "NEWS1"), not a software release number.
Source-file changes are tracked by normal git history.

**Scope note:** this register only covers `src/utils/*Calculator(s).ts`.
`src/config/edOperationalStandards.ts` and the native-ai heuristics under
`lib/native-ai/` (triage suggestion, admission probability, journey/LOS
prediction, post-ED orientation) are operational risk-scoring heuristics,
not named published clinical instruments, and are governed instead by
[AI_CONFIGURATION_MAP.md](../AI_CONFIGURATION_MAP.md) and the new
[`AiTruthLabel`](../src/components/ai/AiTruthLabel.tsx) provenance labels
(P0.4).

## Single-instrument files

| Instrument | Source file | Citation |
|---|---|---|
| ABCD² score (stroke risk after TIA) | `abcd2Calculator.ts` | Johnston SC, et al. Lancet. 2007;369(9558):283–292. |
| Apgar score | `apgarScoreCalculator.ts` | Apgar V. Curr Res Anesth Analg. 1953;32:260–267. |
| ACC/AHA 2013 Pooled Cohort Equations (10-yr ASCVD risk) | `ascvdPceCalculator.ts` | Goff DC Jr, et al. Circulation. 2014;129(25 suppl 2):S49–S73. |
| AUDIT-C (alcohol screening) | `auditCCalculator.ts` | Bush K, et al. Arch Intern Med. 1998;158(16):1789–1795; WHO AUDIT guidance. |
| BISAP score (pancreatitis severity) | `bisapScoreCalculator.ts` | Wu BU, et al. Am J Gastroenterol. 2008;103(5):1198–1203. |
| Bishop score (labour induction) | `bishopScoreCalculator.ts` | Bishop EH. Obstet Gynecol. 1964;24:266–268. |
| Braden Scale (pressure injury risk) | `bradenScaleCalculator.ts` | Bergstrom N, et al. Nurs Res. 1987;36(4):205–210. |
| Canadian C-Spine Rule | `canadianCSpineCalculator.ts` | Stiell IG, et al. JAMA. 2001;286(15):1841–1848. |
| Modified Centor / McIsaac score | `centorMcisaacCalculator.ts` | McIsaac WJ, et al. Ann Intern Med. 1998;129(5):381–388. |
| Child-Pugh score | `childPughCalculator.ts` | Pugh RNH et al. Br J Surg. 1973;60(8):646–649; Child CG, Turcotte JG. 1964. |
| KDIGO CKD staging (incl. CKD-EPI 2021 eGFR) | `ckdStagingCalculator.ts` | KDIGO CKD Work Group. KDIGO 2012 Clinical Practice Guideline. |
| FIB-4 index | `fib4Calculator.ts` | Vallet-Pichard A, et al. Hepatology. 2007;46(1):266–272. |
| Framingham 10-yr hard CHD risk | `framinghamRiskCalculator.ts` | Wilson PWF, et al. Circulation. 1998;97(18):1837–1847; NHLBI Framingham tables. |
| GAD-7 | `gad7Calculator.ts` | Spitzer RL, et al. Arch Intern Med. 2006;166(10):1092–1097. |
| GRACE 2.0 ACS admission risk | `graceAcsCalculator.ts` | Fox KAA et al.; GRACE Investigators. BMJ. 2006;332:1091–1100; updated GRACE 2.0 tools. |
| HAS-BLED | `hasBledCalculator.ts` | Pisters R, et al. Europace. 2010;12(7):923–928; Lip GYH et al. Eur Heart J. 2010;31(8):1004–1019. |
| HEART score | `heartScoreCalculator.ts` | Six AJ, et al. Chest. 2008;134(6):1157–1164. |
| MELD / MELD-Na | `meldCalculator.ts` | MELD: Kamath PS et al. Hepatology. 2001;33(2):464–470. MELD-Na: Kim WR et al. Hepatology. 2008;48(3):997–1005; UNOS 2016 policy. |
| Morse Fall Scale | `morseFallScaleCalculator.ts` | Morse JM, et al. Am J Nurs. 1989;89(3):334–337. |
| NEWS2 | `news2Calculator.ts` | Royal College of Physicians. National Early Warning Score (NEWS) 2. |
| NEXUS C-Spine Rule | `nexusCSpineCalculator.ts` | Hoffman JR, et al. N Engl J Med. 2000;343(2):94–99. |
| NIH Stroke Scale (NIHSS) | `nihssCalculator.ts` | Brott T, et al. Stroke. 1989;20(7):864–870; NINDS NIHSS training materials. |
| Ottawa Ankle / Foot Rules | `ottawaAnkleCalculator.ts` | Stiell IG, et al. JAMA. 1994;271(11):827–832; BMJ. 1995;311(7005):594–597. |
| PECARN pediatric head injury rule | `pecarnHeadCalculator.ts` | Kuppermann N, et al. Lancet. 2009;374(9696):1160–1170. |
| PERC (PE rule-out criteria) | `percCalculator.ts` | Kline JA, et al. J Thromb Haemost. 2008;6(5):772–780; Ann Emerg Med. 2004;44(4 Suppl):S26–S27. |
| PHQ-9 | `phq9Calculator.ts` | Kroenke K, et al. J Gen Intern Med. 2001;16(9):606–613. |
| qSOFA | `qsofaCalculator.ts` | Singer M, et al. (Sepsis-3). JAMA. 2016;315(8):801–810. |
| Ranson criteria | `ransonCriteriaCalculator.ts` | Ranson JH, et al. Am J Surg. 1974;128(5):576–584. |
| STOP-Bang | `stopBangCalculator.ts` | Chung F, et al. Anesthesiology. 2008;108(5):812–821; Br J Anaesth. 2012;108(5):768–775. |
| TIMI risk score (UA/NSTEMI) | `timiUaNstemiCalculator.ts` | Antman EM, et al. JAMA. 2000;284(7):835–842. |
| Wells PE prediction rule | `wellsPeCalculator.ts` | Wells PS, et al. Thromb Haemost. 2000;83(3):416–420; Ann Intern Med. 2001;135(2):98–107. |

## Bundle files (multiple instruments per file)

| Instrument | Source file | Citation |
|---|---|---|
| CHADS2 | `cardiologyRiskCalculators.ts` | Gage BF, et al. JAMA. 2001;285(22):2864–2870. |
| Duke Treadmill Score | `cardiologyRiskCalculators.ts` | Mark DB, et al. Ann Intern Med. 1987;106(6):793–800. |
| Reynolds Risk Score | `cardiologyRiskCalculators.ts` | Ridker PM, et al. JAMA. 2007;297(6):611–619; Circulation. 2008;118(22):2243–2251. |
| Glasgow Coma Scale (GCS) | `emergencyCriticalCareCalculators.ts` | Teasdale G, Jennett B. Lancet. 1974;2:81–84. |
| CURB-65 | `emergencyCriticalCareCalculators.ts` | Lim WS, et al. Thorax. 2003;58:377–382; British Thoracic Society CAP guideline. |
| APACHE II | `emergencyCriticalCareCalculators.ts` | Knaus WA, et al. Crit Care Med. 1985;13(10):818–829. |
| HOMA-IR, corrected calcium, calculated osmolality, BMI, Mosteller BSA, Devine IBW, adjusted body weight, waist-to-hip ratio | `endocrineMetabolicCalculators.ts` | Standard clinical formulas (not a single named published instrument) — formula shown inline per calculator, no external citation to verify. |
| Maddrey Discriminant Function | `hepatologyGiCalculators.ts` | Maddrey WC, et al. Gastroenterology. 1978;75(2):193–199. |
| APRI (AST-to-Platelet Ratio Index) | `hepatologyGiCalculators.ts` | Wai CT, et al. Hepatology. 2003;38(2):518–526. |
| Glasgow-Blatchford Score | `hepatologyGiCalculators.ts` | Blatchford O, et al. Lancet. 2000;356(9238):1318–1321. |
| Rockall score | `hepatologyGiCalculators.ts` | Rockall TA, et al. Gut. 1996;38(3):316–321. |
| *(none found)* | `hospitalOperationsCalculators.ts` | Operational/administrative helpers, not patient-facing clinical scores — no citation applicable. |
| ICH Score | `neurologyCalculators.ts` | Hemphill JC III, et al. Stroke. 2001. |
| FOUR Score | `neurologyCalculators.ts` | Wijdicks EFM, et al. Ann Neurol. 2005. |
| NIHSS (summary/handoff view) | `neurologyCalculators.ts` | Brott T, et al. Stroke. 1989. *(same instrument as `nihssCalculator.ts` above — a second, summary-oriented implementation; see intended-use boundary doc for the resulting dual-implementation flag.)* |
| Shock Index, Anion Gap, RASS | `nextWaveCalculatorUtils.ts` | Standard bedside formulas/scales. **Gap: RASS (Richmond Agitation-Sedation Scale) has no citation in source** — should cite Sessler CN, et al. Am J Respir Crit Care Med. 2002;166(10):1338–1344 before clinician sign-off. |
| Pediatric BP screening | `pediatricsObgynCalculators.ts` | Flynn JT, et al. Pediatrics. 2017 (AAP Clinical Practice Guideline). |
| Neonatal hyperbilirubinemia nomogram | `pediatricsObgynCalculators.ts` | Kemper AR, et al. Pediatrics. 2022 (AAP Clinical Practice Guideline). |
| Pediatric weight-based dosing | `pediatricsObgynCalculators.ts` | **Not implemented — explicit placeholder.** Source disclaimer: "does not calculate mg/kg doses, dose ranges, infusion rates, maximum doses, or medication recommendations." |
| CAGE (alcohol screening) | `psychiatryScreeningCalculators.ts` | Ewing JA. JAMA. 1984;252(14):1905–1907. |
| MMSE | `psychiatryScreeningCalculators.ts` | Folstein MF, et al. J Psychiatr Res. 1975;12(3):189–198. |
| MoCA | `psychiatryScreeningCalculators.ts` | Nasreddine ZS, et al. J Am Geriatr Soc. 2005;53(4):695–699. **Not implemented — explicit placeholder** ("does not display items, calculate a score, diagnose cognitive impairment"). |
| PCL-5 (PTSD checklist) | `psychiatryScreeningCalculators.ts` | Weathers FW, et al. National Center for PTSD. 2013. |
| MDQ (Mood Disorder Questionnaire) | `psychiatryScreeningCalculators.ts` | Hirschfeld RMA, et al. Am J Psychiatry. 2000;157(11):1873–1875. |
| Epworth Sleepiness Scale | `psychiatryScreeningCalculators.ts` | Johns MW. Sleep. 1991;14(6):540–545. |
| Columbia-Suicide Severity Rating Scale workflow entry | `psychiatryScreeningCalculators.ts` | Posner K, et al. Am J Psychiatry. 2011;168(12):1266–1277. **Source explicitly states this is a documentation/routing workflow entry, not an official C-SSRS administration or score** — the citation should not be read as claiming a validated C-SSRS implementation. |
| BODE Index (COPD) | `pulmonologyCalculators.ts` | Celli BR, et al. N Engl J Med. 2004;350:1005–1012. |
| GOLD COPD staging | `pulmonologyCalculators.ts` | Global Initiative for Chronic Obstructive Lung Disease (GOLD) strategy document. |
| A-a gradient | `pulmonologyCalculators.ts` | Standard alveolar gas equation — no single citation applicable. |
| PaO2/FiO2 + Berlin ARDS criteria | `pulmonologyCalculators.ts` | Berlin Definition of ARDS (ARDS Definition Task Force. JAMA. 2012;307(23):2526–2533). |
| ROX index | `pulmonologyCalculators.ts` | Roca O, et al. (HFNC outcome prediction in pneumonia/AHRF). |
| Pneumonia Severity Index (PSI) | `pulmonologyCalculators.ts` | Fine MJ, et al. N Engl J Med. 1997;336:243–250. |
| Acute asthma severity bands | `pulmonologyCalculators.ts` | Composite of common acute-asthma pathway features (PEF, SpO2, speech, accessory muscle use, exhaustion, mental status, silent chest) — no single citation applicable. |

## Findings for clinician sign-off to weigh

1. **RASS has no citation in source** (`nextWaveCalculatorUtils.ts`) — the
   only real gap found where an instrument is presented as a named clinical
   scale but its published source isn't in the file. Low risk (RASS is
   widely standardized and the implementation only documents descriptive
   ranges, it doesn't score against uncited thresholds) but should be fixed
   before sign-off for completeness.
2. **Two explicit placeholders exist and are already honestly labeled as
   such in source**: MoCA (`psychiatryScreeningCalculators.ts`) and
   pediatric weight-based dosing (`pediatricsObgynCalculators.ts`). Neither
   computes a real score today — both are safe by construction (they refuse
   to calculate rather than calculating something ungoverned), but a
   clinician reviewer should confirm the UI makes this non-implementation
   obvious rather than looking like a working tool.
3. **NIHSS is implemented twice** (`nihssCalculator.ts` and a second
   "summary/handoff view" inside `neurologyCalculators.ts`), same citation,
   different code paths. Not necessarily a bug — a summary view for handoff
   is a reasonable distinct use case — but worth a clinician/architecture
   confirmation that the two can't silently drift out of agreement over
   time, since nothing in this codebase currently tests that they produce
   identical output for identical input.
