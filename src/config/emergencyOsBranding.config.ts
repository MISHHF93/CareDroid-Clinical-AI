import { CAREDROID_PRODUCT } from './caredroidProduct.config';

/** @deprecated Internal alias — external copy uses CAREDROID_PRODUCT / productName "CareDroid". */
export const EMERGENCY_OS_BRANDING = Object.freeze({
  productName: CAREDROID_PRODUCT.name,
  platformLine: CAREDROID_PRODUCT.platformLine,
  firstResolutionLine: CAREDROID_PRODUCT.firstResolutionLine,
  /** @deprecated Legacy key; value is the copilot badge label, not a separate product identity. */
  aiiosName: CAREDROID_PRODUCT.copilotBadge,
  copilotName: CAREDROID_PRODUCT.copilotName,
  receptionName: CAREDROID_PRODUCT.receptionName,
  receptionRoute: CAREDROID_PRODUCT.receptionRoute,
  receptionSummary: CAREDROID_PRODUCT.receptionSummary,
  commandCenterName: CAREDROID_PRODUCT.whiteboardName,
  commandCenterRoute: CAREDROID_PRODUCT.whiteboardRoute,
  safetyLine: CAREDROID_PRODUCT.safetyLine,
  safetyShort: CAREDROID_PRODUCT.safetyShort,
  commandCenterSummary: CAREDROID_PRODUCT.whiteboardSummary,
  roleFlowSummary: CAREDROID_PRODUCT.roleFlowSummary,
  copilotIntro: CAREDROID_PRODUCT.copilotIntro,
} as const);

export type EmergencyOsBranding = typeof EMERGENCY_OS_BRANDING;

/**
 * Merge organization.settings.emergencyOs.branding over global CareDroid copy.
 */
export function getOrgEmergencyBranding(emergencyOsSettings: Record<string, unknown> = {}) {
  const orgBranding =
    (emergencyOsSettings?.branding as Partial<EmergencyOsBranding> | undefined) || {};
  return Object.freeze({
    ...EMERGENCY_OS_BRANDING,
    ...orgBranding,
  });
}
