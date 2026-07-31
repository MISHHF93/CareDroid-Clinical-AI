import * as path from 'path';
import * as ts from 'typescript';

/**
 * Cycle 241: NestJS's global ValidationPipe (whitelist: true,
 * forbidNonWhitelisted: true, main.ts) only whitelist-validates a @Body()
 * parameter when its declared type is a real `class`. ValidationPipe's own
 * toValidate() skips [String, Boolean, Number, Array, Object] metatypes and
 * returns the parsed body untouched -- and a TypeScript interface/type-alias
 * reflects as plain `Object` at runtime, since interfaces are erased from
 * emitted JS. So a @Body() typed as an interface, inline object literal,
 * `Record<string, any>`, or `any` gets zero whitelist/validation protection,
 * silently, no matter how strict the global pipe config looks. See
 * backend-contract-hardening.spec.ts's "class DTO actually gets
 * whitelist-validated" test for a live proof of this mechanism.
 *
 * This test walks every real POST/PATCH/PUT @Body() parameter across every
 * controller (via the TypeScript compiler API + full type checker, not
 * grep/regex -- a regex can't tell an interface from a class through an
 * import, and can't resolve `SmartIntakeCreateInput`-style aliased types) and
 * asserts the exact current baseline (117 as of Cycle 244; 135 originally
 * found Cycle 241, worked down incrementally since -- see SCORECARD.md for
 * the per-cycle history). This is NOT a claim that all of them are equally
 * severe -- verified examples span the full range, from a public,
 * unauthenticated telemetry-ingestion endpoint down to services that only
 * ever read specific known fields off the raw body (e.g. `createReferral`'s
 * `String(input.patientId || '')`-style extraction), which is safe from
 * mass-assignment even without Nest-level validation. Severity triage is
 * real, per-instance work for future cycles (see SCORECARD.md) -- this test's
 * job is narrower: make the count and membership of "unvalidated" routes
 * impossible to silently drift, in either direction. If this test fails
 * because the count went DOWN, a route got fixed -- update BASELINE to
 * remove it (not because the test is wrong). If it went UP, a new route was
 * added with the same unvalidated-body gap -- fix it or add it deliberately.
 *
 * Cycle 247: closed the single largest cluster in this baseline -- all 33
 * GovernanceController routes plus the 6 PlatformGovernanceController routes
 * hitting the same underlying PlatformGovernanceService (39 total, one-third
 * of the original 117). A frontend-caller sweep confirmed zero of the 32
 * mutation routes across both controllers have any real UI caller today, so
 * the new DTOs (backend/src/modules/platform-governance/dto/
 * governance-actions.dto.ts) were designed from what the controllers/service
 * actually read off the body plus the real TypeORM entity columns each
 * write eventually lands on, not from a reverse-engineered live payload.
 */

const HTTP_BODY_DECORATORS = new Set(['Post', 'Patch', 'Put']);

function decoratorName(deco: ts.Decorator): string | null {
  const expr = deco.expression;
  if (ts.isCallExpression(expr)) {
    if (ts.isIdentifier(expr.expression)) return expr.expression.text;
    if (ts.isPropertyAccessExpression(expr.expression)) return expr.expression.name.text;
  } else if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  return null;
}

function getDecorators(node: ts.HasDecorators): readonly ts.Decorator[] {
  return ts.getDecorators(node) || [];
}

function isControllerClass(node: ts.ClassDeclaration): boolean {
  return getDecorators(node).some((d) => decoratorName(d) === 'Controller');
}

function findUnvalidatedBodyParams(backendRoot: string): string[] {
  const configPath = ts.findConfigFile(backendRoot, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error('backend tsconfig.json not found');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const checker = program.getTypeChecker();

  const results: string[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const normalized = sourceFile.fileName.split(path.sep).join('/');
    if (!normalized.includes('/backend/src/')) continue;
    if (!sourceFile.fileName.endsWith('.controller.ts')) continue;

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name && isControllerClass(node)) {
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member)) continue;
          const methodDecorators = getDecorators(member);
          const httpDeco = methodDecorators.find((d) =>
            HTTP_BODY_DECORATORS.has(decoratorName(d) || ''),
          );
          if (!httpDeco) continue;

          for (const param of member.parameters) {
            const bodyDeco = getDecorators(param).find((d) => decoratorName(d) === 'Body');
            if (!bodyDeco) continue;

            // @Body('fieldName') extracts one primitive field, not the whole
            // object -- not the same whole-object-whitelist-bypass surface.
            if (/@Body\(\s*['"`]/.test(bodyDeco.getText())) continue;

            let isClass = false;
            if (param.type) {
              const type = checker.getTypeFromTypeNode(param.type);
              const symbol = type.getSymbol();
              isClass = symbol ? !!(symbol.flags & ts.SymbolFlags.Class) : false;
            }

            if (!isClass) {
              const rel = path.relative(backendRoot, sourceFile.fileName).split(path.sep).join('/');
              const methodName = member.name.getText();
              results.push(`${rel} :: ${node.name!.text}.${methodName}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  return results.sort();
}

// Generated 2026-07-30 (Cycle 247) via the exact walk above. 135 originally
// found Cycle 241; worked down across Cycles 242/244/247 (5 + 6 + 39 fixed)
// to this 78-entry baseline. Cycle 247 closed every GovernanceController and
// PlatformGovernanceController route (39 -- see SCORECARD.md and the DTO
// header comment for the full writeup).
const BASELINE: string[] = [
  'src/modules/ai/ai.controller.ts :: AIController.createProposal',
  'src/modules/ai/ai.controller.ts :: AIController.executeProposal',
  'src/modules/ai/ai.controller.ts :: AIController.rejectProposal',
  'src/modules/audit/audit.controller.ts :: AuditController.syncAuditEvent',
  'src/modules/cost-optimizer/cost-optimizer.controller.ts :: CostOptimizerController.route',
  'src/modules/emergency-os/ed-copilot.nest-parity.controller.ts :: EdCopilotNestParityController.query',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.applyOcrJobToIntake',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.compareSimulation',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createIntakePatient',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createOcrJob',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createPatient',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createReferral',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createSmartIntakeVerticalSlice',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.evaluateDigitalTwinScenario',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.evaluateOperationalIntelligence',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.evaluateSimulation',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.extractPatientDocumentArtifacts',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.initializeDigitalTwin',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.postEmsHandoff',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.postReceptionEscalation',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.postReceptionHandoff',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.postTriageAssist',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.queryCopilot',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.recordClinicalCalculatorResult',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.recordCopilotInteraction',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.registerFederatedHospital',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.reviewOcrJobField',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.reviewPatientDocumentArtifact',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.reviewWorkflowAutomation',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.simulateDigitalTwin',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.updateFederatedModel',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.updateLiveSimulation',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.updateSettings',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: AICallInterrogationController.detectOHCA',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: AICallInterrogationController.interpretECG',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: ERPulseHandoverController.generateERPulseHandover',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: FederatedEMSController.process112Call',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: LMECSController.predictSeverity',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: LMECSController.selectClients',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: OrganizationalDigitalTwinController.runPredictiveSimulation',
  'src/modules/emergency-os/emergency-os.research.controller.ts :: OrganizationalDigitalTwinController.synchronizePatientFlow',
  'src/modules/native-ai/native-ai.controller.ts :: NativeAiController.addTriageRule',
  'src/modules/native-ai/native-ai.controller.ts :: NativeAiController.evaluateTriage',
  'src/modules/native-ai/native-ai.controller.ts :: NativeAiController.getClinicalAcuity',
  'src/modules/native-ai/native-ai.controller.ts :: NativeAiController.inferSpecialists',
  'src/modules/native-ai/native-ai.controller.ts :: NativeAiController.routePatient',
  'src/modules/organizations/organizations.controller.ts :: OrganizationsController.updateFeatureFlags',
  'src/modules/organizations/organizations.controller.ts :: OrganizationsController.updateSettings',
  'src/modules/organizations/organizations.controller.ts :: OrganizationsController.updateTenantAdministration',
  'src/modules/organizations/settings-features.controller.ts :: SettingsFeaturesController.updateFeatureSettings',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.analyzeReasoning',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.approveDocument',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.draftClinicalEvent',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.draftDischargeSummary',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.draftPriorAuth',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.draftReferral',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.draftSoap',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.explainWhy',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.exportDocument',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.generateWorkflow',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.suggestCalculator',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.summarizeAuditTrail',
  'src/modules/platform-systems/clinical-intelligence.controller.ts :: ClinicalIntelligenceController.transcribeDictation',
  'src/modules/platform-systems/integrations.controller.ts :: IntegrationsController.createFhirConnection',
  'src/modules/platform-systems/integrations.controller.ts :: IntegrationsController.previewHl7MessageReplay',
  'src/modules/platform-systems/integrations.controller.ts :: IntegrationsController.syncFhirConnection',
  'src/modules/platform-systems/integrations.controller.ts :: IntegrationsController.testFhirConnection',
  'src/modules/platform-systems/integrations.controller.ts :: IntegrationsController.testHl7Message',
  'src/modules/platform-systems/patient-clinical-data.controller.ts :: PatientClinicalDataController.addRiskScore',
  'src/modules/platform-systems/patient-clinical-data.controller.ts :: PatientClinicalDataController.createPatientEvent',
  'src/modules/platform-systems/patient-clinical-data.controller.ts :: PatientClinicalDataController.importEhrPatient',
  'src/modules/platform-systems/patient-clinical-data.controller.ts :: PatientClinicalDataController.importLabs',
  'src/modules/platform-systems/patient-clinical-data.controller.ts :: PatientClinicalDataController.importMedications',
  'src/modules/platform-systems/patient-clinical-data.controller.ts :: PatientClinicalDataController.importObservations',
  'src/modules/platform-systems/platform-systems.controller.ts :: PlatformSystemsController.createEmergencyPatient',
  'src/modules/platform-systems/platform-systems.controller.ts :: PlatformSystemsController.createEmergencyReferral',
  'src/modules/platform-systems/platform-systems.controller.ts :: PlatformSystemsController.updateEmergencyPatient',
  'src/modules/tool-calling/tool-calling.controller.ts :: ToolCallingController.execute',
].sort();

describe('body validation coverage (Cycle 241)', () => {
  it('unvalidated @Body() params match the known, reviewed baseline exactly', () => {
    const backendRoot = path.join(__dirname, '..');
    const found = findUnvalidatedBodyParams(backendRoot);

    const newlyUnvalidated = found.filter((entry) => !BASELINE.includes(entry));
    const noLongerUnvalidated = BASELINE.filter((entry) => !found.includes(entry));

    expect({ newlyUnvalidated, noLongerUnvalidated }).toEqual({
      newlyUnvalidated: [],
      noLongerUnvalidated: [],
    });
  }, 30000);
});
