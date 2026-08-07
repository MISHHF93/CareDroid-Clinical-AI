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
 *
 * Cycle 248: closed the next-largest cluster -- ClinicalIntelligenceController's
 * 13 routes, all pure PlatformSystemsService.demo() passthroughs with zero
 * real persistence. A frontend sweep found zero callers with a
 * capability-specific payload (10 of 13 only ever reached via a generic
 * demo-button component sending an identical fixed shape; 2 have no caller
 * at all), so the new DTOs (backend/src/modules/platform-systems/dto/
 * clinical-intelligence-actions.dto.ts) formalize each route's intended
 * shape as already encoded in this controller's own pre-existing unit-test
 * fixtures, not a reverse-engineered live contract.
 *
 * Cycle 249: closed 23 of EmergencyOsController's 27 routes (the largest
 * cluster in the codebase) -- unlike the two prior cycles, most of these
 * are real, live, PHI-adjacent routes with genuine frontend callers, so
 * each one's actual sent payload was checked field-by-field before adding
 * forbidNonWhitelisted (2 real mismatches found and preserved rather than
 * rejected -- see backend/src/modules/emergency-os/dto/
 * emergency-os-actions.dto.ts's header for specifics). The remaining 4
 * routes on this controller are deliberately still open: createPatient/
 * createIntakePatient/createSmartIntakeVerticalSlice are patient-creation
 * endpoints already under roadmap item #18's own multi-cycle caution since
 * Cycle 191 (real divergent field shapes across callers, not yet safe to
 * whitelist); updateSettings takes EmergencyOsSettingsPatch, a mapped type
 * over a ~12-section nested settings contract that deserves its own
 * dedicated DTO-building cycle, not a drive-by alongside 23 other routes.
 *
 * Cycle 250: closed emergency-os.research.controller.ts's 8 routes
 * (federated EMS/LMECS, AI call interrogation, organizational digital
 * twin, ER Pulse handover). A frontend sweep found zero real callers for
 * any of the 8 -- only static documentation/inventory files reference
 * these paths -- so the new DTOs (backend/src/modules/emergency-os/dto/
 * emergency-os-research-actions.dto.ts) mirror the backend's own
 * already-declared, fully-enumerable interfaces exactly.
 *
 * Cycle 251: closed PatientClinicalDataController's 6 routes (EHR/labs/
 * medications/observations import, patient events, risk scores) -- all 6
 * pure PlatformSystemsService.demo() passthroughs. A registry sweep
 * (platformSystems.tsx) found the 4 import routes ARE reached by the
 * generic demo button (their entries are correctly wired `method: 'POST'`,
 * unlike governance's), always sending the same fixed demo-contract shape
 * established in Cycle 248; createPatientEvent/addRiskScore have no
 * reachable caller at all -- their registry entries point at a different
 * backend route or a GET method respectively.
 *
 * Cycle 252: closed IntegrationsController's 5 routes (FHIR connection
 * create/test/sync, HL7 message test/replay-preview) -- also pure
 * PlatformSystemsService.demo() passthroughs, matching item #30's finding
 * that FHIR/HL7 integration is confirmed placeholder-only. Both capability
 * registry entries point at GET list endpoints, not these POST routes, so
 * the demo button never reaches any of the 5. One real caller exists in
 * source (emergencySettingsApi.tsx's testIntegrationConnection(), sending
 * {testOnly: true}) but is itself never invoked from any component --
 * real code, just not yet wired to a UI trigger; its field is honored
 * alongside this controller's own test fixtures anyway.
 *
 * Cycle 253: closed NativeAiController's 5 routes (route/clinical-acuity/
 * triage-rules/triage-rules-evaluate/specialists-infer) -- unlike the last
 * several cycles' demo passthroughs, native-ai.service.ts confirmed by
 * direct read to run 4 of these straight through routePatientToClinical
 * Specialists/buildClinicalAcuityLeaderboard/inferTriageFromExpertSystem
 * with sourceState: 'live'. The new PatientDto (backend/src/modules/
 * native-ai/dto/native-ai-actions.dto.ts) mirrors src/types/emergency.ts's
 * Patient interface field-for-field rather than a reverse-engineered
 * subset, since every real caller constructs a Patient through that one
 * canonical interface (unlike EmergencyOsController's still-deferred
 * createPatient/createIntakePatient, there's no evidence of divergent
 * intake-time shapes here). A frontend sweep found all 5 wrapper functions
 * in src/services/nativeAiApi.ts send exactly the expected shapes, but only
 * fetchClinicalAcuityLeaderboard is actually invoked today -- the other 4
 * are real, wired code with no UI trigger yet.
 *
 * Cycle 254: closed AIController's 3 remaining routes (createProposal/
 * rejectProposal/executeProposal). All 3 previously took `Record<string,
 * unknown>` and manually coerced every field with `String(x || y ||
 * default)`-style fallbacks -- the controller's own code already proved
 * every field is honestly optional at this boundary. The new DTOs
 * (backend/src/modules/ai/dto/ai-action-proposal-actions.dto.ts) mirror
 * AiActionProposalService.create()'s own already-declared inline input
 * type field-for-field. A frontend sweep found the interactive-AI action-
 * proposal UI (actionProposalService.ts) is a fully separate, local-only,
 * in-memory implementation that never calls these backend routes at all --
 * real, wired code with zero live callers today, same pattern as several
 * prior cycles. `organizations.controller.ts`'s 3 routes (updateSettings/
 * updateFeatureFlags/updateTenantAdministration) were investigated and
 * deliberately left open this cycle: their service methods merge into the
 * same kind of large, multi-section, deeply-nested settings blob (branding,
 * subscription, integrations, departments, workspaceDefaults, permissions
 * overrides, navigation, dashboardLayout, feature-flag platform state) that
 * caused `EmergencyOsController.updateSettings` to be deferred back in
 * Cycle 249 -- the same risk profile, not newly discovered here, deserving
 * its own dedicated cycle rather than a rushed drive-by.
 *
 * Cycle 255: closed all 5 remaining single-route, non-deferred files in one
 * pass -- each small enough that bundling them was more efficient than 5
 * separate cycles (matching Cycle 242's precedent of closing several small
 * single-entry routes together): AuditController.syncAuditEvent (real
 * caller: src/services/syncService.ts's syncAuditLogs(), the offline-sync-
 * on-reconnect flow, sending exactly {action, resourceType, resourceId,
 * timestamp}); CostOptimizerController.route (zero real callers, DTO
 * mirrors cost-optimizer.types.ts's own CostOptimizationRequest exactly);
 * EdCopilotNestParityController.query (zero real callers -- confirmed real
 * traffic goes to the separate, already-DTO'd /api/emergency/copilot/query
 * instead; both fields kept optional to preserve the handler's existing
 * manual validation-error response instead of Nest's generic 400);
 * SettingsFeaturesController.updateFeatureSettings (real caller:
 * src/services/emergencySettingsApi.tsx's updateSettingsFeatureFlag(),
 * invoked from src/store/emergencyStore.ts, sending exactly the 4 fields
 * organizations.service.ts's updateEmergencyFeatureSetting() already
 * declares); ToolCallingController.execute (zero real callers, DTO mirrors
 * tool-calling.types.ts's own ToolCallingRequest exactly, including typing
 * `classification` as the real IntentClassification rather than a loosened
 * Record<> so the DTO stays structurally assignable to
 * ToolExecutionService.executePrompt()'s parameter type).
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

// Generated 2026-08-03 (Cycle 255), re-generated 2026-08-04 (Cycle 270) via
// the exact walk above. 135 originally found Cycle 241; worked down across
// Cycles 242/244/247/248/249/250/251/252/253/254/255 (5 + 6 + 39 + 13 + 23 +
// 8 + 6 + 5 + 5 + 3 + 5 fixed) to a 10-entry baseline. Cycle 270 closed
// PlatformSystemsController's 3 routes (createEmergencyPatient/
// updateEmergencyPatient/createEmergencyReferral) -- confirmed zero live
// callers (a second, unwired front door onto the same EmergencyPatientService/
// ReferralService the deferred EmergencyOsController routes below also use),
// so the "shape-divergence" risk that blocks those doesn't apply here; see
// backend/src/modules/platform-systems/dto/emergency-patient-actions.dto.ts's
// header for the full writeup.
//
// 2026-08-06: closed OrganizationsController.updateFeatureFlags (see
// backend/src/modules/organizations/dto/update-feature-flags.dto.ts's
// header) -- it had been lumped in with the other 2 OrganizationsController
// entries as "large nested settings blob," but on direct read its service
// method (FeatureFlagService.applyUpdate) takes a small, already-typed,
// flat 7-field interface (FeatureFlagUpdateInput), not a settings blob --
// the deferral reason didn't actually apply to this one route. The other 6
// remain deliberately deferred: 3 EmergencyOsController patient-creation
// routes have real, live divergent-shape callers (roadmap item #18, open
// since Cycle 191); EmergencyOsController.updateSettings and
// OrganizationsController's updateSettings/updateTenantAdministration take
// genuinely large, multi-section nested settings contracts that deserve
// their own dedicated DTO-building cycle, not a drive-by.
const BASELINE: string[] = [
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createIntakePatient',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createPatient',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.createSmartIntakeVerticalSlice',
  'src/modules/emergency-os/emergency-os.controller.ts :: EmergencyOsController.updateSettings',
  'src/modules/organizations/organizations.controller.ts :: OrganizationsController.updateSettings',
  'src/modules/organizations/organizations.controller.ts :: OrganizationsController.updateTenantAdministration',
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
