# Consolidation Decisions

Generated on 2026-06-13 from `DUPLICATE_MAP.md` R1 fresh duplicate map. This is a planning decision table only; no consolidation, deletion, rename, redirect, or stub execution was performed. The alert canonical target `src/engine/alertEngine.ts` is used below as the survivor for alert/notification findings; it was not itself listed as a duplicate implementation hit in the source map.

Format: `[FILE PATH] → [ACTION] → [CANONICAL TARGET] → [REASON]`

## DELETE
`src/components/EmergencyWhiteboard.jsx` → DELETE → `src/pages/emergency/index.tsx` → Pure compatibility re-export for the canonical Emergency Whiteboard route.
`src/components/EmergencyPatientCard.jsx` → DELETE → `src/components/PatientCard.tsx` → Pure compatibility re-export for the canonical patient card.
`src/components/EmergencyPatientDetailPanel.jsx` → DELETE → `src/components/PatientDetailPanel.tsx` → Pure compatibility re-export for the canonical patient detail panel.
`frontend/src/config/unified-navigation.config.ts` → DELETE → `src/components/Sidebar.tsx` → Legacy frontend navigation source duplicates active sidebar configuration and is not imported by the active app.
`src/navigation/primaryNavigation.js` → DELETE → `src/components/Sidebar.tsx` → Compatibility re-export of legacy navigation config with no unique navigation logic.

## MERGE INTO
`src/pages/tools/PatientSummaryAi.jsx` → MERGE INTO → `src/lib/ai/client.ts` → Useful clinical intelligence request/result behavior should be absorbed into the canonical AI client surface.
`store/featureStore.ts` → MERGE INTO → `src/store/emergencyStore.ts` → Useful feature flag and backend sync concepts should be represented through the canonical Emergency OS state path.
`frontend/src/store/emergency-store.ts` → MERGE INTO → `src/store/emergencyStore.ts` → Persisted ED capacity, boarding, copilot, EMS, UI, websocket, and integration state should be consolidated into the canonical store.
`src/contexts/WorkspaceContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Active workspace state should collapse into Emergency OS state for this ED-only consolidation.
`src/contexts/WhiteLabelContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Tenant branding state is useful, but duplicate provider state should be absorbed or bridged through the canonical store.
`src/contexts/ToolPreferencesContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Favorites, pinned tools, recents, and access recording should become canonical Emergency OS tool preference state.
`src/contexts/NotificationContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Notification state should be represented once and wired to the canonical alert path.
`src/contexts/TenantContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Tenant/org scoping needed by ED requests should be centralized instead of kept in a duplicate provider.
`src/contexts/OfflineProvider.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Offline mode is useful app state and should be exposed through the canonical Emergency OS state model.
`src/contexts/UserIdentityContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Role, personalization, activity, and workspace identity needed by ED surfaces should be consolidated.
`src/contexts/UserContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Auth, user, token, and role permission state should not remain a separate duplicate source for Emergency OS.
`src/contexts/ConversationContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Conversation and active tool state should be consolidated for ED Copilot and command surfaces.
`src/contexts/ThemeContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Theme preference is useful shell state and should be folded into the canonical state path.
`src/contexts/SystemConfigContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Runtime config, degraded API status, and AI usage state should become canonical shell state.
`src/contexts/OrganizationContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → Organization profile state should be absorbed where needed for ED tenant-aware behavior.
`src/contexts/CostTrackingContext.jsx` → MERGE INTO → `src/store/emergencyStore.ts` → AI usage, budgets, and cost alerts are useful but should not remain a separate duplicate state provider.
`lib/ai/client.ts` → MERGE INTO → `src/lib/ai/client.ts` → Direct Anthropic caller has useful provider request logic, but the survivor is the frontend-safe canonical AI client.
`backend/src/modules/ai/ai.service.ts` → MERGE INTO → `src/lib/ai/client.ts` → Generic AI query, audit, cost, and tool prompt patterns should inform the canonical AI client contract.
`backend/src/modules/chat/chat.service.ts` → MERGE INTO → `src/lib/ai/client.ts` → ED Copilot fallback and clinical tool execution behavior should be preserved behind one AI client surface.
`lib/ai/responseParser.ts` → MERGE INTO → `src/lib/ai/client.ts` → Streaming response parsing and action-card extraction are useful AI client behavior.
`src/services/clinicalIntelligenceApi.js` → MERGE INTO → `src/lib/ai/client.ts` → Clinical intelligence endpoints should be normalized through the canonical AI client.
`/emergency/patients` → MERGE INTO → `src/pages/emergency/index.tsx` → ED patient workspace behavior is useful and should be absorbed into the canonical whiteboard experience.
`/emergency/journey` → MERGE INTO → `src/pages/emergency/index.tsx` → Patient journey flow should be represented from the canonical Emergency Whiteboard surface.
`/emergency/ems` → MERGE INTO → `src/pages/emergency/index.tsx` → EMS pipeline behavior is ED-specific and should be integrated into the canonical whiteboard.
`/emergency/intake` → MERGE INTO → `src/pages/emergency/index.tsx` → Smart intake behavior is useful ED workflow logic for the canonical whiteboard.
`/emergency/queues` → MERGE INTO → `src/pages/emergency/index.tsx` → Queue intelligence should become part of the canonical ED operations surface.
`/emergency/reassessment` → MERGE INTO → `src/pages/emergency/index.tsx` → Reassessment workflow belongs in the canonical Emergency OS patient flow.
`/emergency/capacity` → MERGE INTO → `src/pages/emergency/index.tsx` → Capacity detail behavior should be absorbed into the canonical whiteboard/capacity view.
`/emergency/boarding` → MERGE INTO → `src/pages/emergency/index.tsx` → Boarding workflow is useful ED logic for the canonical whiteboard.
`/emergency/referrals` → MERGE INTO → `src/pages/emergency/index.tsx` → Referral intelligence should remain as canonical Emergency OS workflow logic.
`/emergency/provincial-health` → MERGE INTO → `src/pages/emergency/index.tsx` → Provincial connector behavior is ED integration logic and should fold into the canonical surface.
`/emergency/integrations` → MERGE INTO → `src/pages/emergency/index.tsx` → Integration Hub behavior should be consolidated behind the canonical whiteboard route.
`/emergency/copilot` → MERGE INTO → `src/pages/emergency/index.tsx` → ED Copilot workspace should be available from the canonical Emergency OS surface.
`/emergency/analytics` → MERGE INTO → `src/pages/emergency/index.tsx` → Emergency analytics are useful ED operational insights and should be absorbed into the canonical whiteboard.
`/emergency/simulation` → MERGE INTO → `src/pages/emergency/index.tsx` → Real-time simulation behavior should become canonical Emergency OS scenario behavior.
`/emergency/shift` → MERGE INTO → `src/pages/emergency/index.tsx` → Shift workspace logic should be consolidated into the canonical ED shell.
`/emergency/settings` → MERGE INTO → `src/pages/emergency/index.tsx` → Emergency settings should remain reachable through the canonical ED shell.
`types/emergency.ts (Priority enum)` → MERGE INTO → `src/types/emergency.ts` → Priority aliases and labels should be folded into the canonical Emergency OS types.
`types/emergency.ts (Patient interface)` → MERGE INTO → `src/types/emergency.ts` → Rich patient fields should be reviewed and absorbed into the canonical patient type where useful.
`types/emergency.ts (Staff interface)` → MERGE INTO → `src/types/emergency.ts` → Staff identity and assignment fields should be consolidated into the canonical staff type.
`backend/src/models/unified-patient.model.ts` → MERGE INTO → `src/types/emergency.ts` → Backend patient concepts should inform shared Emergency OS type alignment without preserving duplicate frontend models.
`backend/src/modules/users/entities/user.entity.ts` → MERGE INTO → `src/types/emergency.ts` → Role enum overlap should be reconciled with canonical Emergency OS role typing.
`backend/src/modules/subscriptions/entities/subscription.entity.ts` → MERGE INTO → `src/types/emergency.ts` → Status enum duplication should be reviewed and only ED-relevant status semantics retained.
`src/contexts/NotificationContext.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → In-memory notifications should route through a single alert/notification engine.
`src/components/notifications/NotificationToast.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Toast presentation is useful, but trigger state should be driven by the canonical alert engine.
`src/hooks/useNotificationActions.js` → MERGE INTO → `src/engine/alertEngine.ts` → Workflow/security/system notification helpers should become alert engine helpers.
`src/components/NotificationPreferences.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Notification preference UI behavior should connect to one alert/notification backend contract.
`src/services/NotificationService.js` → MERGE INTO → `src/engine/alertEngine.ts` → Push, stream, unread, device, and notification API handling should be centralized under alert behavior.
`src/components/ApiStateBanner.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → API loading/error/unsupported banners should be emitted through the canonical alert path.
`src/components/ToolApiErrorBanner.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Tool API error banners duplicate alert presentation behavior.
`src/components/ApiConfigDegradedBanner.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Degraded API configuration alerts should be centralized.
`src/components/ui/Alert.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Generic alert primitive should remain as presentation behind canonical alert state.
`src/components/clinical/ClinicalAlertBanner.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Clinical alert findings/actions should be normalized through one alert engine.
`src/components/clinical/AnomalyBanner.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Anomaly banner thresholds should become canonical alert rules.
`src/components/StateSourceNotice.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → Demo/live/backend-unavailable notices are alert-like state and should be centralized.
`src/components/EMSCriticalBroadcast.jsx` → MERGE INTO → `src/engine/alertEngine.ts` → EMS critical checklist broadcasts should dispatch through the canonical alert engine.
`src/pages/emergency/index.tsx (local toast/API alert)` → MERGE INTO → `src/engine/alertEngine.ts` → Local whiteboard toast/error alert behavior should use the canonical alert engine.
`src/layout/AppShell.jsx (navigation rail)` → MERGE INTO → `src/components/AppShell.tsx` → Legacy rail/header/menu behavior should be reviewed and only useful shell pieces absorbed.
`src/components/Header.tsx` → MERGE INTO → `src/components/AppShell.tsx` → Header controls are useful shell behavior that should be owned by the canonical layout.
`src/components/CommandPalette.jsx` → MERGE INTO → `src/components/AppShell.tsx` → Command/search navigation should remain as canonical shell behavior.
`src/config/unified-navigation.config.ts` → MERGE INTO → `src/components/Sidebar.tsx` → Active visible navigation config should be consumed by the canonical sidebar.
`src/config/navigation.config.js` → MERGE INTO → `src/components/Sidebar.tsx` → Legacy APP_SHELL and primary nav projection should be folded into the canonical sidebar config.
`src/config/commandPalette.config.js` → MERGE INTO → `src/components/Sidebar.tsx` → Route command metadata should align with canonical sidebar destinations.
`src/navigation/iconRegistry.js` → MERGE INTO → `src/components/Sidebar.tsx` → Shared icon mapping is useful and should support the canonical sidebar/navigation surface.
`src/pages/tools/Calculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Legacy calculator hub has useful calculator launch and interface behavior.
`src/components/calculators/qSOFA.tsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → qSOFA scoring and ED note/alert behavior should be available through the canonical hub.
`src/components/calculators/HEARTScore.tsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → HEART scoring and patient note behavior should be available through the canonical hub.
`src/components/ClinicalScoreCalculator.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Older HEART/qSOFA/NIHSS modal has reusable scoring and AI-assist behavior.
`src/components/PediatricDrugCalculator.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Pediatric emergency dosing should become a canonical hub tool.
`src/pages/tools/sourceBackedClinicalCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Source-backed Wells, PERC, GRACE, NIHSS, C-Spine, Ottawa, NEXUS, and PECARN forms are useful clinical tools.
`src/pages/tools/mentalHealthCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → PHQ-9 and GAD-7 calculators should be accessible from the canonical hub.
`src/pages/tools/pr4aCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → ASCVD, AUDIT-C, CKD, and Stop-Bang calculators should be retained through the canonical hub.
`src/pages/tools/pr8ClinicalBatchCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → HEART, Centor, Bishop, Apgar, Braden, Morse, Ranson, BISAP, FIB-4, and Framingham forms are useful clinical calculators.
`src/pages/tools/hepatologyGiCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → APRI, Glasgow-Blatchford, Maddrey, and Rockall forms should remain hub tools.
`src/pages/tools/abcd2Calculator.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → ABCD2 score form is useful clinical calculator logic.
`src/pages/tools/nextWaveCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Shock Index, Anion Gap, and RASS forms should be consolidated into the hub.
`src/pages/tools/emergencyCriticalCareCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → GCS, CURB-65, APACHE II, MEWS, RTS, and PEWS forms are ED-relevant.
`src/pages/tools/cardiologyCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Cardiology risk calculators are useful clinical tools for the hub.
`src/pages/tools/pulmonologyCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Pulmonology calculators should be retained as hub tools.
`src/pages/tools/nephrologyCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Nephrology calculators should be retained as hub tools.
`src/pages/tools/endocrineMetabolicCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Endocrine and metabolic calculators should be retained as hub tools.
`src/pages/tools/neurologyCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Neurology calculators, including NIHSS-related tools, should be retained in the hub.
`src/pages/tools/pediatricsObgynCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Pediatrics and OB calculators should be retained as hub tools.
`src/pages/tools/psychiatryScreeningCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Psychiatry screening calculators should be retained as hub tools.
`src/pages/tools/hospitalOperationsCalculators.jsx` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Operational calculators have unique logic, but should be gated behind the canonical hub or future module decision.
`src/utils/qsofaCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → qSOFA utility should support the canonical calculator implementation.
`src/utils/news2Calculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → NEWS2 utility should support the canonical calculator implementation.
`src/utils/childPughCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Child-Pugh utility should support the canonical calculator implementation.
`src/utils/hasBledCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → HAS-BLED utility should support the canonical calculator implementation.
`src/utils/meldCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → MELD utility should support the canonical calculator implementation.
`src/utils/timiUaNstemiCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → TIMI UA/NSTEMI utility should support the canonical calculator implementation.
`src/utils/wellsPeCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Wells PE utility should support the canonical calculator implementation.
`src/utils/percCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → PERC utility should support the canonical calculator implementation.
`src/utils/graceAcsCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → GRACE ACS utility should support the canonical calculator implementation.
`src/utils/nihssCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → NIHSS utility should support the canonical calculator implementation.
`src/utils/canadianCSpineCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Canadian C-Spine utility should support the canonical calculator implementation.
`src/utils/ottawaAnkleCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Ottawa Ankle/Foot utility should support the canonical calculator implementation.
`src/utils/nexusCSpineCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → NEXUS C-Spine utility should support the canonical calculator implementation.
`src/utils/pecarnHeadCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → PECARN Head utility should support the canonical calculator implementation.
`src/utils/ascvdPceCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → ASCVD PCE utility should support the canonical calculator implementation.
`src/utils/ckdStagingCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → CKD staging utility should support the canonical calculator implementation.
`src/utils/auditCCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → AUDIT-C utility should support the canonical calculator implementation.
`src/utils/phq9Calculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → PHQ-9 utility should support the canonical calculator implementation.
`src/utils/gad7Calculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → GAD-7 utility should support the canonical calculator implementation.
`src/utils/emergencyCriticalCareCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Emergency critical care utilities should support the canonical calculator implementation.
`src/utils/nephrologyCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Nephrology utilities should support the canonical calculator implementation.
`src/utils/endocrineMetabolicCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Endocrine/metabolic utilities should support the canonical calculator implementation.
`src/utils/pediatricsObgynCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Pediatrics/OB utilities should support the canonical calculator implementation.
`src/utils/psychiatryScreeningCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Psychiatry screening utilities should support the canonical calculator implementation.
`src/utils/pulmonologyCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Pulmonology utilities should support the canonical calculator implementation.
`src/utils/cardiologyRiskCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Cardiology risk utilities should support the canonical calculator implementation.
`src/utils/heartScoreCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → HEART utility should support the canonical calculator implementation.
`src/utils/centorMcisaacCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Centor/McIsaac utility should support the canonical calculator implementation.
`src/utils/apgarScoreCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Apgar utility should support the canonical calculator implementation.
`src/utils/bishopScoreCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Bishop score utility should support the canonical calculator implementation.
`src/utils/bradenScaleCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Braden scale utility should support the canonical calculator implementation.
`src/utils/morseFallScaleCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Morse Fall Scale utility should support the canonical calculator implementation.
`src/utils/bisapScoreCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → BISAP utility should support the canonical calculator implementation.
`src/utils/ransonCriteriaCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Ranson criteria utility should support the canonical calculator implementation.
`src/utils/fib4Calculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → FIB-4 utility should support the canonical calculator implementation.
`src/utils/framinghamRiskCalculator.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Framingham risk utility should support the canonical calculator implementation.
`src/utils/nextWaveCalculatorUtils.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Shock Index, Anion Gap, and RASS utilities should support the canonical calculator implementation.
`src/utils/hospitalOperationsCalculators.js` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Operational calculator utilities have unique logic and should be gated or moved through the canonical hub decision.
`backend/src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service.ts` → MERGE INTO → `src/components/ClinicalCalculatorHub.tsx` → Backend SOFA executor has useful calculator behavior to align with the canonical calculator hub.
`src/services/apiClient.js` → MERGE INTO → `src/lib/apiClient.ts` → Existing shared API implementation should move behind the canonical TypeScript import path.
`src/config/appConfig.js` → MERGE INTO → `src/lib/apiClient.ts` → API and websocket environment config should be centralized in the canonical client.
`src/config/apiEnv.js` → MERGE INTO → `src/lib/apiClient.ts` → Same-origin API timeout/default handling should be absorbed into the canonical client.
`src/config/api.config.js` → MERGE INTO → `src/lib/apiClient.ts` → API route normalization/constants should support the canonical API client.
`src/services/emergencyOsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Emergency OS endpoint wrappers should route through the canonical API client.
`src/services/clinicalIntelligenceApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Clinical intelligence endpoint wrappers should share canonical request behavior.
`src/services/clinicalToolsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Clinical tools catalog/statistics calls should share canonical API behavior.
`src/services/clinicalOrchestratorApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Tool execution calls should use the canonical API client.
`src/services/NotificationService.js` → MERGE INTO → `src/lib/apiClient.ts` → Notification API, stream, and device registration calls should use the canonical API client.
`src/services/liveTrackingApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Fleet/live tracking endpoint code has useful request patterns but should not remain a separate client.
`src/services/reassessmentApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Reassessment endpoint calls should use the canonical API client.
`src/services/surgeApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Surge endpoint calls should use the canonical API client.
`src/services/emergencyTransportApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Emergency transport endpoint calls should use the canonical API client.
`src/services/successCenterApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Success center endpoint code should be gated but share canonical request behavior.
`src/services/complianceApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Compliance endpoint wrappers should reuse canonical request behavior.
`src/services/emergencyStaffingApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Emergency staffing endpoint calls should use the canonical API client.
`src/services/saasHealthApi.js` → MERGE INTO → `src/lib/apiClient.ts` → SaaS health endpoint code should be gated but share canonical request behavior.
`src/services/enterpriseIdentityApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Enterprise identity endpoint code should be gated but share canonical request behavior.
`src/services/platformSystemsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Platform systems endpoint code should be gated but share canonical request behavior.
`src/services/emergencyGovernanceApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Emergency governance endpoint calls should share canonical request behavior while the workspace is stubbed.
`src/services/subscriptionApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Billing/subscription endpoint code should be gated but share canonical request behavior.
`src/services/emergencySettingsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Emergency settings endpoint calls should use the canonical API client.
`src/services/aiCommandCenterApi.js` → MERGE INTO → `src/lib/apiClient.ts` → AI command center endpoint code should be gated but share canonical request behavior.
`src/services/artifactsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Artifact endpoint code should be gated but share canonical request behavior.
`src/services/emergencyCopilotApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Emergency Copilot endpoint calls should use the canonical API client.
`src/services/productCatalogApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Commercial catalog endpoint code should be gated but share canonical request behavior.
`src/services/whiteLabelApi.js` → MERGE INTO → `src/lib/apiClient.ts` → White-label endpoint calls should share canonical request behavior.
`src/services/patientManagementApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Patient management endpoint calls should use the canonical API client.
`src/services/platformAssetsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Platform assets endpoint code should be gated but share canonical request behavior.
`src/services/userIdentityApi.js` → MERGE INTO → `src/lib/apiClient.ts` → User identity endpoint calls should share canonical request behavior.
`src/services/customerPortalApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Customer portal endpoint code should be gated but share canonical request behavior.
`src/services/memoryApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Memory endpoint code should be gated but share canonical request behavior.
`src/services/platformGovernanceApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Platform governance endpoint code should be gated but share canonical request behavior.
`src/services/boardingApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Boarding endpoint calls should use the canonical API client.
`src/services/smartIntakeApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Smart intake endpoint calls should use the canonical API client.
`src/services/tenantIsolationApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Tenant isolation endpoint code should share canonical request behavior.
`src/services/auditApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Audit endpoint calls should use the canonical API client.
`src/services/trainingApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Training endpoint code should be gated but share canonical request behavior.
`src/services/emergencyAnalyticsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Emergency analytics endpoint calls should use the canonical API client.
`src/services/automationAuditApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Automation audit endpoint code should be gated but share canonical request behavior.
`src/services/clinicalAlertsApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Clinical alerts endpoint calls should use the canonical API client.
`src/services/clinicalContentApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Clinical protocol/drug endpoint calls should use the canonical API client.
`src/services/evaluationApi.js` → MERGE INTO → `src/lib/apiClient.ts` → Evaluation/research endpoint code should be gated but share canonical request behavior.
`src/services/analyticsService.ts` → MERGE INTO → `src/lib/apiClient.ts` → Analytics event posting should use the canonical API client and be gated for non-ED analytics.
`src/services/clinicalChatService.js` → MERGE INTO → `src/lib/apiClient.ts` → Chat message/action/vitals endpoint calls should use the canonical API client.
`src/services/emergencyRealtimeService.js` → MERGE INTO → `src/lib/apiClient.ts` → Websocket/SSE route building should align with the canonical API client.
`src/layout/AppShell.jsx (layout shell)` → MERGE INTO → `src/components/AppShell.tsx` → Legacy shell has useful drawer/toast/broadcast/panel behavior, but the canonical layout is `src/components/AppShell.tsx`.

## RENAME TO
`src/pages/emergency/ClinicalCalculatorHub.jsx` → RENAME TO → `src/components/ClinicalCalculatorHub.tsx` → The implemented Emergency OS calculator hub is the right survivor behavior, but the requested canonical target is the component path.

## KEEP
`src/pages/emergency/index.tsx` → KEEP → `src/pages/emergency/index.tsx` → Canonical Emergency Whiteboard patient grid and route.
`src/components/PatientCard.tsx` → KEEP → `src/components/PatientCard.tsx` → Canonical patient display card.
`src/components/PatientDetailPanel.tsx` → KEEP → `src/components/PatientDetailPanel.tsx` → Canonical patient detail panel.
`src/store/emergencyStore.ts` → KEEP → `src/store/emergencyStore.ts` → Canonical Emergency OS state store.
`src/lib/ai/client.ts` → KEEP → `src/lib/ai/client.ts` → Canonical frontend AI client wrapper.
`/emergency/whiteboard` → KEEP → `src/pages/emergency/index.tsx` → Canonical Emergency Whiteboard route.
`/emergency/tools` → KEEP → `src/components/ClinicalCalculatorHub.tsx` → Canonical calculator hub route should survive through the component target.
`src/types/emergency.ts (Priority enum)` → KEEP → `src/types/emergency.ts` → Canonical compact ED priority enum.
`src/types/emergency.ts (Patient interface)` → KEEP → `src/types/emergency.ts` → Canonical Emergency OS frontend patient interface.
`src/types/emergency.ts (Staff interface)` → KEEP → `src/types/emergency.ts` → Canonical Emergency OS frontend staff interface.
`src/components/Sidebar.tsx` → KEEP → `src/components/Sidebar.tsx` → Canonical navigation component.
`src/components/AppShell.tsx (navigation shell)` → KEEP → `src/components/AppShell.tsx` → Active root layout that owns sidebar, header, command palette, detail, Copilot, EMS, and reassessment surfaces.
`src/components/ClinicalCalculatorHub.tsx` → KEEP → `src/components/ClinicalCalculatorHub.tsx` → Requested canonical calculator hub target.
`src/lib/apiClient.ts` → KEEP → `src/lib/apiClient.ts` → Requested canonical API client target.
`src/components/AppShell.tsx (layout shell)` → KEEP → `src/components/AppShell.tsx` → Canonical full-page application shell.

## STUB OUT
`src/pages/Patients.jsx` → STUB OUT → `src/pages/emergency/index.tsx` → Legacy commercial patient/case workflow page is non-canonical and should be replaced by an ED placeholder or route handoff.
`/emergency/federated-learning` → STUB OUT → `src/pages/emergency/index.tsx` → Federated learning is a research/future-module workspace, not a canonical ED workspace.
`/emergency/digital-twin` → STUB OUT → `src/pages/emergency/index.tsx` → Hybrid digital twin is a future-module workspace and should be placeholder-only.
`/emergency/ai-governance` → STUB OUT → `src/pages/emergency/index.tsx` → Governance workspace is non-ED for this consolidation.
`/ai-governance` → STUB OUT → `src/pages/emergency/index.tsx` → Root governance alias is non-ED and should not remain a parallel workspace.

## REDIRECT
`/dashboard` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Dashboard route should continue redirecting to the Emergency Whiteboard.
`/workspace` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Workspace route should redirect to the Emergency Whiteboard.
`/patients` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Patients route should redirect to the Emergency OS patient surface.
`/operations` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Operations route should redirect to the Emergency Whiteboard.
`/operations-center` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Digital Operations Center route should redirect to the Emergency Whiteboard.
`/hospital-map` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Hospital Map route should redirect to the Emergency Whiteboard.
`/medical-iot` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Medical IoT route should redirect to the Emergency Whiteboard.
`/fleet/*` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Fleet routes are non-ED workspace routes and should redirect to the Emergency Whiteboard.
`/workspaces` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Workspaces route should redirect to the Emergency Whiteboard.
`/platform-admin` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Platform Admin route is non-ED and should redirect to the Emergency Whiteboard.
`/customer-portal` → REDIRECT → `src/pages/emergency/index.tsx` → Legacy Customer Portal route is non-ED and should redirect to the Emergency Whiteboard.

## Counts
DELETE 5 | MERGE 171 | RENAME 1

KEEP 15 | STUB OUT 5 | REDIRECT 11 | TOTAL 208
