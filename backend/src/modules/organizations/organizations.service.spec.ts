import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';
import { IntegrationOffering } from '../product-catalog/entities/integration-offering.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { IntegrationStatus } from '../product-catalog/enums/product-catalog.enums';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
} from '../subscriptions/entities/subscription.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { OrganizationMembership, OrganizationMembershipRole } from './entities/organization-membership.entity';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const organizationRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => ({ id: row.id || 'org-1', ...row })),
  };
  const membershipRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };
  const profileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (row) => row),
  };
  const subscriptionRepository = {
    findOne: jest.fn(),
  };
  const integrationRepository = {
    find: jest.fn(),
  };
  const productRepository = {
    find: jest.fn(),
  };
  const platformAssetsService = {
    getOrganizationEntitlements: jest.fn(),
    installPackForOrganization: jest.fn(),
    listRoleProfiles: jest.fn(),
  };

  const user = { id: 'user-1', role: UserRole.ADMIN } as User;
  const org = {
    id: 'org-1',
    name: 'CareDroid Hospital',
    slug: 'caredroid-hospital',
    organizationType: OrganizationType.HOSPITAL,
    country: 'US',
    branding: {
      displayName: 'CareDroid Health',
      logoUrl: 'https://cdn.example.com/logo.svg',
      faviconUrl: 'https://cdn.example.com/favicon.ico',
      primaryColor: '#0f766e',
      accentColor: '#2563eb',
      theme: 'light',
      loginTitle: 'CareDroid Health Portal',
      loginSubtitle: 'Sign in with your hospital credentials.',
      loginBackgroundImageUrl: 'https://cdn.example.com/login-bg.jpg',
      dashboardTitle: 'CareDroid Health Command',
      dashboardSubtitle: 'Your hospital command center.',
    },
    settings: {
      complianceMode: 'hipaa',
      departments: ['emergency', 'icu'],
      workspaceDefaults: [{ id: 'emergency', name: 'Emergency', enabledToolIds: ['qsofa'] }],
      integrationsRequested: ['fhir'],
      integrations: ['hl7'],
      permissionsOverrides: { admin: ['CONFIGURE_SYSTEM'] },
      subscription: { tier: SubscriptionTier.ENTERPRISE, status: SubscriptionStatus.ACTIVE },
    },
    workspaces: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  } as Organization;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: organizationRepository },
        { provide: getRepositoryToken(OrganizationMembership), useValue: membershipRepository },
        { provide: getRepositoryToken(UserProfile), useValue: profileRepository },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepository },
        { provide: getRepositoryToken(IntegrationOffering), useValue: integrationRepository },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: PlatformAssetsService, useValue: platformAssetsService },
      ],
    }).compile();

    service = moduleRef.get(OrganizationsService);
    jest.clearAllMocks();
    membershipRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-1',
      role: OrganizationMembershipRole.OWNER,
    });
    organizationRepository.findOne.mockResolvedValue(org);
    subscriptionRepository.findOne.mockResolvedValue(null);
    integrationRepository.find.mockResolvedValue([
      {
        slug: 'fhir',
        name: 'FHIR',
        category: 'ehr',
        status: IntegrationStatus.AVAILABLE,
        linkedAssetId: 'fhir-connector',
      },
      {
        slug: 'hl7',
        name: 'HL7',
        category: 'ehr',
        status: IntegrationStatus.AVAILABLE,
        linkedAssetId: 'hl7-bridge',
      },
      { slug: 'pacs', name: 'PACS', category: 'imaging', status: IntegrationStatus.ROADMAP },
    ]);
    platformAssetsService.getOrganizationEntitlements.mockResolvedValue([]);
    platformAssetsService.installPackForOrganization.mockResolvedValue({});
    platformAssetsService.listRoleProfiles.mockResolvedValue([
      {
        id: 'emergency-physician',
        label: 'Emergency Physician',
        intendedRoles: ['physician'],
        specialties: ['Emergency Medicine'],
        requiredPermissions: ['USE_CALCULATORS'],
        defaultDashboard: 'emergency',
        defaultAiAgentId: 'agent-emergency',
      },
    ]);
    profileRepository.find.mockResolvedValue([
      {
        userId: 'user-1',
        fullName: 'Dr. Rivera',
        specialty: 'Emergency Medicine',
        verified: true,
        roleProfileId: 'emergency-physician',
      },
    ]);
    productRepository.find.mockResolvedValue([]);
  });

  it('builds an organization engine model with tenant, branding, subscription, and integrations', async () => {
    const engine = await service.getEngineForUser(user, 'org-1');

    expect(engine).toMatchObject({
      organization: {
        id: 'org-1',
        organizationType: OrganizationType.HOSPITAL,
      },
      tenant: {
        tenantId: 'caredroid-hospital',
        complianceMode: 'hipaa',
      },
      branding: {
        displayName: 'CareDroid Health',
        logoUrl: 'https://cdn.example.com/logo.svg',
        faviconUrl: 'https://cdn.example.com/favicon.ico',
        primaryColor: '#0f766e',
        accentColor: '#2563eb',
        theme: 'light',
        loginTitle: 'CareDroid Health Portal',
        dashboardTitle: 'CareDroid Health Command',
      },
      subscription: {
        tier: SubscriptionTier.ENTERPRISE,
        source: 'organization-settings',
      },
    });
    expect(engine.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'fhir', status: 'requested' }),
        expect.objectContaining({ slug: 'hl7', status: 'enabled' }),
      ]),
    );
    expect(engine.supportedOrganizationTypes).toEqual(
      expect.arrayContaining([OrganizationType.RESEARCH_CENTER]),
    );
  });

  it('updates organization engine settings and assigns default packs when type changes', async () => {
    const result = await service.updateOrganizationSettings(user, 'org-1', {
      organizationType: OrganizationType.RESEARCH_CENTER,
      branding: { displayName: 'Research Center' },
      subscription: { tier: SubscriptionTier.ACADEMIC, status: SubscriptionStatus.ACTIVE },
    });

    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'research-education',
    );
    expect(organizationRepository.save).toHaveBeenCalled();
    expect(result.tenant.organizationType).toBe(OrganizationType.RESEARCH_CENTER);
    expect(result.branding.displayName).toBe('Research Center');
  });

  it('returns public white-label branding by tenant slug', async () => {
    organizationRepository.findOne.mockResolvedValue({
      ...org,
      branding: {
        displayName: 'CareDroid Health',
        logoUrl: 'https://cdn.example.com/logo.svg',
        faviconUrl: 'https://cdn.example.com/favicon.ico',
        primaryColor: '#0f766e',
        accentColor: '#2563eb',
        theme: 'light',
        loginTitle: 'CareDroid Health Portal',
        loginSubtitle: 'Sign in with your hospital credentials.',
        loginBackgroundImageUrl: 'https://cdn.example.com/login-bg.jpg',
        dashboardTitle: 'CareDroid Health Command',
        dashboardSubtitle: 'Your hospital command center.',
      },
      settings: { ...(org.settings as Record<string, unknown>) },
    } as Organization);

    const result = await service.getPublicWhiteLabel('caredroid-hospital');

    expect(organizationRepository.findOne).toHaveBeenCalledWith({
      where: { slug: 'caredroid-hospital' },
    });
    expect(result).toMatchObject({
      tenantId: 'caredroid-hospital',
      organizationName: 'CareDroid Hospital',
      branding: {
        displayName: 'CareDroid Health',
        logoUrl: 'https://cdn.example.com/logo.svg',
        faviconUrl: 'https://cdn.example.com/favicon.ico',
        loginTitle: 'CareDroid Health Portal',
        loginBackgroundImageUrl: 'https://cdn.example.com/login-bg.jpg',
        dashboardTitle: 'CareDroid Health Command',
      },
    });
  });

  it('updates configuration studio settings including direct pack selections', async () => {
    const configurableOrg = {
      ...org,
      branding: { ...(org.branding as Record<string, unknown>) },
      settings: { ...(org.settings as Record<string, unknown>) },
    } as Organization;
    organizationRepository.findOne.mockResolvedValue(configurableOrg);
    productRepository.find.mockResolvedValue([
      {
        id: 'product-emergency-department',
        packIds: ['emergency-department-pack', 'emergency-medicine'],
      },
    ]);

    await service.updateConfiguration(user, 'org-1', {
      navigation: { hiddenNavIds: ['legacy'], primaryLanding: '/command' },
      branding: { displayName: 'CareDroid Command', accentColor: '#0055ff' },
      workspaceDefaults: [{ name: 'Emergency Command', type: 'emergency' }],
      enabledAgentIds: ['agent-emergency'],
      enabledProductIds: ['product-emergency-department'],
      enabledPackIds: ['emergency-department-pack'],
      dashboardLayout: { home: ['platform-analytics'] },
      permissionsOverrides: { roles: { admin: ['configure-system'] } },
    });

    expect(organizationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        branding: expect.objectContaining({
          displayName: 'CareDroid Command',
          accentColor: '#0055ff',
        }),
        settings: expect.objectContaining({
          navigation: { hiddenNavIds: ['legacy'], primaryLanding: '/command' },
          workspaceDefaults: [{ name: 'Emergency Command', type: 'emergency' }],
          enabledAgentIds: ['agent-emergency'],
          enabledProductIds: ['product-emergency-department'],
          enabledPackIds: ['emergency-department-pack'],
          assignedProductPackIds: ['emergency-department-pack', 'emergency-medicine'],
          resolvedPackIds: ['core-platform', 'emergency-department-pack', 'emergency-medicine'],
          dashboardLayout: { home: ['platform-analytics'] },
          permissionsOverrides: { roles: { admin: ['configure-system'] } },
          configuration: expect.objectContaining({
            enabledPackIds: ['emergency-department-pack'],
          }),
        }),
      }),
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'core-platform',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'emergency-department-pack',
    );
    expect(platformAssetsService.installPackForOrganization).toHaveBeenCalledWith(
      'org-1',
      'emergency-medicine',
    );
  });

  it('builds a tenant administration model for no-code organization management', async () => {
    organizationRepository.findOne.mockResolvedValue({
      ...org,
      branding: { ...(org.branding as Record<string, unknown>) },
      settings: {
        ...(org.settings as Record<string, unknown>),
        subscription: { tier: SubscriptionTier.ENTERPRISE, status: SubscriptionStatus.ACTIVE },
      },
    } as Organization);
    membershipRepository.find.mockResolvedValue([
      {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        role: OrganizationMembershipRole.OWNER,
        roleProfileId: null,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);

    const admin = await service.getTenantAdministration(user, 'org-1');

    expect(admin.profile).toMatchObject({
      id: 'org-1',
      tenantId: 'caredroid-hospital',
      complianceMode: 'hipaa',
    });
    expect(admin.departments).toEqual(['emergency', 'icu']);
    expect(admin.workspaces).toEqual([
      { id: 'emergency', name: 'Emergency', enabledToolIds: ['qsofa'] },
    ]);
    expect(admin.users).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        displayName: 'Dr. Rivera',
        membershipRole: OrganizationMembershipRole.OWNER,
        roleProfileId: 'emergency-physician',
      }),
    ]);
    expect(admin.roles.roleProfiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'emergency-physician' })]),
    );
    expect(admin.permissions.catalog).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'CONFIGURE_SYSTEM' })]),
    );
    expect(admin.permissions.overrides).toEqual({ admin: ['CONFIGURE_SYSTEM'] });
    expect(admin.integrations).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: 'hl7', status: 'enabled' })]),
    );
    expect(admin.subscriptions.current.tier).toBe(SubscriptionTier.ENTERPRISE);
    expect(admin.noCodeConfiguration.integrationsRequested).toEqual(['fhir']);
  });

  it('updates tenant administration settings without code changes', async () => {
    membershipRepository.find.mockResolvedValue([]);
    const tenantOrg = {
      ...org,
      branding: { ...(org.branding as Record<string, unknown>) },
      settings: { ...(org.settings as Record<string, unknown>) },
    } as Organization;
    organizationRepository.findOne.mockResolvedValue(tenantOrg);

    await service.updateTenantAdministration(user, 'org-1', {
      name: 'Tenant Hospital',
      branding: {
        displayName: 'Tenant Care',
        logoUrl: 'https://cdn.example.com/tenant-logo.svg',
        faviconUrl: 'https://cdn.example.com/tenant-favicon.ico',
        loginTitle: 'Tenant Care Login',
        dashboardTitle: 'Tenant Care Command',
      },
      departments: ['emergency', 'icu', 'emergency'],
      workspaceDefaults: [{ id: 'icu', name: 'ICU', enabledToolIds: ['sofa-score'] }],
      integrations: ['hl7'],
      integrationsRequested: ['fhir', 'pacs'],
      permissionsOverrides: { member: ['USE_AI_CHAT'] },
      subscription: { tier: SubscriptionTier.ENTERPRISE, status: SubscriptionStatus.ACTIVE },
    });

    expect(organizationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Tenant Hospital',
        branding: expect.objectContaining({
          displayName: 'Tenant Care',
          logoUrl: 'https://cdn.example.com/tenant-logo.svg',
          faviconUrl: 'https://cdn.example.com/tenant-favicon.ico',
          loginTitle: 'Tenant Care Login',
          dashboardTitle: 'Tenant Care Command',
        }),
        settings: expect.objectContaining({
          departments: ['emergency', 'icu'],
          workspaceDefaults: [{ id: 'icu', name: 'ICU', enabledToolIds: ['sofa-score'] }],
          integrations: ['hl7'],
          integrationsRequested: ['fhir', 'pacs'],
          permissionsOverrides: { member: ['USE_AI_CHAT'] },
          subscription: { tier: SubscriptionTier.ENTERPRISE, status: SubscriptionStatus.ACTIVE },
        }),
      }),
    );
  });
});
