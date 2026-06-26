import { AUTOMATION_STATUSES, getWorkspaceAutomations } from '../data/automationRegistry';

export const ED_AUTOMATION_MARKETPLACE_CATEGORIES = Object.freeze([
  'Triage',
  'Referral',
  'Documentation',
  'EMS',
  'Capacity',
  'Boarding',
  'Equipment',
  'Discharge',
  'Simulation',
  'Analytics',
]);

const AUTOMATION_CATEGORY_MAP = Object.freeze({
  'emergency-automated-triage-matrix': ['Triage'],
  'emergency-referral-routing': ['Referral'],
  'emergency-surge-staffing': ['Capacity', 'Boarding', 'Analytics'],
  'emergency-simulation-academy': ['Triage', 'Simulation'],
  'emergency-medical-iot-monitoring': ['Equipment'],
  'emergency-documentation-integrity': ['Documentation'],
  'emergency-rag-evidence-retrieval': ['Triage', 'Analytics'],
  'emergency-virtual-ed': ['EMS'],
  'emergency-discharge-summary-drafting': ['Discharge', 'Documentation'],
  'emergency-prior-authorization': ['Referral', 'Discharge'],
});

const ROI_ESTIMATE_MAP = Object.freeze({
  'emergency-automated-triage-matrix': 'Save 6-10 minutes per triage review by routing complaint, vitals, and calculators together.',
  'emergency-referral-routing': 'Reduce consult coordination delay by 15-25 minutes per referral packet.',
  'emergency-surge-staffing': 'Improve surge response by surfacing staffing and boarding pressure before queues peak.',
  'emergency-simulation-academy': 'Reduce training prep time with targeted simulations from live ED workflow gaps.',
  'emergency-medical-iot-monitoring': 'Reduce equipment downtime and missed telemetry checks through device queue visibility.',
  'emergency-documentation-integrity': 'Recover documentation time by flagging missing facts before signature or export.',
  'emergency-rag-evidence-retrieval': 'Reduce manual protocol search by routing complaint intent to evidence and workflows.',
  'emergency-virtual-ed': 'Prepare ED intake earlier by turning remote/EMS context into arrival-ready packets.',
  'emergency-discharge-summary-drafting': 'Save 8-12 minutes per reviewed discharge or admission summary draft.',
  'emergency-prior-authorization': 'Reduce payer packet preparation time for admission, imaging, transfer, or follow-up services.',
});

function buildMarketplaceModule(automation) {
  const enabled = automation.status === AUTOMATION_STATUSES.ACTIVE || automation.status === AUTOMATION_STATUSES.DEMO;
  const disabled = automation.status === AUTOMATION_STATUSES.DISABLED;

  return Object.freeze({
    automationId: automation.automationId,
    title: automation.title,
    description: automation.description,
    categories: Object.freeze(AUTOMATION_CATEGORY_MAP[automation.automationId] || ['Triage']),
    enabled,
    disabled,
    status: automation.status,
    subscriptionTier: automation.subscriptionTier,
    workspaceVisibility: Object.freeze(automation.workspaceVisibility || []),
    roiEstimate: ROI_ESTIMATE_MAP[automation.automationId] || 'ROI estimate pending buyer workflow discovery.',
    riskLevel: automation.riskLevel,
    humanReviewRequired: automation.humanReviewRequired,
    readiness: automation.readiness || null,
  });
}

export const EdAutomationMarketplace = Object.freeze({
  getMarketplaceModules(automations = getWorkspaceAutomations('emergency')) {
    return Object.freeze(automations.map(buildMarketplaceModule));
  },

  getMarketplaceCategories(automations = getWorkspaceAutomations('emergency')) {
    const modules = this.getMarketplaceModules(automations);
    return Object.freeze(
      ED_AUTOMATION_MARKETPLACE_CATEGORIES.map((category) => {
        const categoryModules = modules.filter((module) => module.categories.includes(category));
        return Object.freeze({
          category,
          moduleCount: categoryModules.length,
          enabledCount: categoryModules.filter((module) => module.enabled).length,
          disabledCount: categoryModules.filter((module) => module.disabled).length,
          modules: Object.freeze(categoryModules),
        });
      })
    );
  },

  getMarketplaceMetrics(automations = getWorkspaceAutomations('emergency')) {
    const modules = this.getMarketplaceModules(automations);
    return Object.freeze({
      totalModules: modules.length,
      enabledModules: modules.filter((module) => module.enabled).length,
      disabledModules: modules.filter((module) => module.disabled).length,
      subscriptionTiers: Object.freeze([...new Set(modules.map((module) => module.subscriptionTier))]),
      categories: ED_AUTOMATION_MARKETPLACE_CATEGORIES.length,
      reviewRequired: modules.filter((module) => module.humanReviewRequired).length,
    });
  },

  getMarketplaceDashboard(automations = getWorkspaceAutomations('emergency')) {
    return Object.freeze({
      categories: this.getMarketplaceCategories(automations),
      modules: this.getMarketplaceModules(automations),
      metrics: this.getMarketplaceMetrics(automations),
      packagingStatement:
        'Emergency automations are packaged as sellable SaaS features with tiering, visibility, enablement state, and ROI estimates.',
    });
  },
});

export const getEdAutomationMarketplaceDashboard =
  EdAutomationMarketplace.getMarketplaceDashboard.bind(EdAutomationMarketplace);

export default EdAutomationMarketplace;
