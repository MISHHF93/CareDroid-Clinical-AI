import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';

export const SUPPORTED_ORGANIZATION_TYPES = Object.freeze([
  OrganizationType.HOSPITAL,
  OrganizationType.CLINIC,
  OrganizationType.EMS,
  OrganizationType.UNIVERSITY,
  OrganizationType.RESEARCH_INSTITUTE,
  OrganizationType.RESEARCH_CENTER,
]);

export type BrandingModel = {
  displayName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  theme?: string | null;
  loginTitle?: string | null;
  loginSubtitle?: string | null;
  loginBackgroundImageUrl?: string | null;
  dashboardTitle?: string | null;
  dashboardSubtitle?: string | null;
  dashboardLogoUrl?: string | null;
};

export type TenantModel = {
  tenantId: string;
  organizationId: string;
  organizationType: OrganizationType;
  slug: string;
  country?: string | null;
  isDemoTenant: boolean;
  complianceMode: string;
  workspaceDefaults: unknown[];
};

export type SubscriptionModel = {
  tier: string;
  status: string;
  source: 'user-subscription' | 'organization-settings' | 'default';
  commercialPlanId?: string | null;
  currentPeriodEnd?: Date | string | null;
};

export type IntegrationModel = {
  slug: string;
  name: string;
  category: string;
  status: 'available' | 'requested' | 'enabled' | 'roadmap';
  linkedAssetId?: string | null;
  docsUrl?: string | null;
};

export type OrganizationEngineModel = {
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationType: OrganizationType;
    country?: string | null;
  };
  tenant: TenantModel;
  branding: BrandingModel;
  subscription: SubscriptionModel;
  integrations: IntegrationModel[];
  settings: Record<string, unknown>;
  supportedOrganizationTypes: readonly OrganizationType[];
};
