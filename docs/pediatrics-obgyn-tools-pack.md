# Pediatrics and OB-GYN Tools Pack

This pack adds pediatric, neonatal, pregnancy, and perinatal decision-support tools across the unified CareDroid tool inventory. All tools are labeled as pediatric/OB decision support only and must be used with validated source charts, local protocols, and clinician review.

## Safety Scope

- No pediatric medication dosing is provided in this pack. The Pediatric Dose Safety Checker is a placeholder-only safety checklist and intentionally does not calculate mg/kg doses, dose ranges, infusion rates, maximum doses, or medication recommendations.
- Assistants and dashboards do not diagnose, determine disposition, recommend treatment, recommend delivery timing, place orders, or replace urgent maternal, fetal, neonatal, pediatric sepsis, airway, trauma, resuscitation, or emergency pathways.
- Bilirubin, growth, BP, and dating helpers require source-chart or local-policy reconciliation before clinical use.

## Tier A Tools

- APGAR
- Bishop Score
- Gestational Age Calculator
- Pediatric BP Percentile
- Pediatric GCS
- Pediatric Early Warning Score
- Pregnancy Due Date Calculator
- Fenton Growth Chart Helper
- Neonatal Bilirubin Risk Helper
- Pediatric Dose Safety Checker placeholder only

## Tier B Assistants

- Pediatric Sepsis Assistant
- Pregnancy Workflow Assistant
- Neonatal Assessment Assistant
- OB Triage Assistant

## Tier C Dashboards

- Neonatal Dashboard
- Maternal Monitoring Dashboard
- Pediatric Command Center
- Growth Trend Analytics
- Perinatal Risk Dashboard

## Validated Source Anchors

- Apgar: Apgar V. A proposal for a new method of evaluation of the newborn infant. Curr Res Anesth Analg. 1953.
- Bishop Score: Bishop EH. Pelvic scoring for elective induction. Obstet Gynecol. 1964.
- Pregnancy dating / due date: ACOG Committee Opinion No. 700, Methods for Estimating the Due Date. Obstet Gynecol. 2017.
- Pediatric BP: Flynn JT, et al. AAP Clinical Practice Guideline for Screening and Management of High Blood Pressure in Children and Adolescents. Pediatrics. 2017.
- Pediatric GCS: Teasdale and Jennett GCS foundation with pediatric verbal-response adaptations used in clinical practice.
- PEWS: Brighton-style Pediatric Early Warning Score concepts with local pediatric escalation policy.
- Fenton growth: Fenton TR, Kim JH. Revised Fenton growth chart for preterm infants. BMC Pediatr. 2013.
- Neonatal bilirubin: Kemper AR, et al. AAP 2022 hyperbilirubinemia guideline for infants 35 or more weeks gestation.

## Implementation Notes

- Tier A calculators are local, mobile-first forms in the shared calculators UI and route through canonical `/tools/calculators/:slug` paths.
- Tier B and Tier C launch through `/tools/pediatrics-obgyn/:toolId` and seed Assistant with guarded pediatric/OB copy.
- The pack is wired through the unified ID contract, registry, intent catalog, inventory, calculator hub, backend intent patterns, route tests, utility tests, and pack-level inventory tests.
