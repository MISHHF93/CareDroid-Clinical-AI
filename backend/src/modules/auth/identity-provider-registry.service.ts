import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type IdentityProviderStatus = 'supported' | 'planned' | 'unavailable';

type IdentityProviderRegistryEntry = {
  id: string;
  name: string;
  category: 'sso' | 'saml' | 'oidc' | 'directory';
  status: IdentityProviderStatus;
  protocol: string;
  entryPath: string | null;
  tenantConfigurationRequired: boolean;
  notes: string;
  capabilities: string[];
};

@Injectable()
export class IdentityProviderRegistryService {
  constructor(private readonly configService: ConfigService) {}

  getRegistry() {
    const googleConfigured = Boolean(
      this.configService.get<{ google?: { clientId?: string } }>('oauth')?.google?.clientId ||
        process.env.GOOGLE_CLIENT_ID,
    );

    const providers: IdentityProviderRegistryEntry[] = [
      {
        id: 'sso',
        name: 'Enterprise SSO',
        category: 'sso',
        status: 'planned',
        protocol: 'policy',
        entryPath: null,
        tenantConfigurationRequired: true,
        notes: 'Umbrella enterprise SSO policy layer for tenant-enforced identity provider routing.',
        capabilities: ['tenant-routing', 'domain-discovery', 'jit-provisioning-planned'],
      },
      {
        id: 'saml',
        name: 'SAML 2.0',
        category: 'saml',
        status: 'planned',
        protocol: 'saml2',
        entryPath: '/api/auth/saml',
        tenantConfigurationRequired: true,
        notes: 'Placeholder endpoint exists; full metadata exchange and assertion validation are planned.',
        capabilities: ['idp-metadata-planned', 'acs-endpoint-planned', 'signed-assertions-planned'],
      },
      {
        id: 'oidc',
        name: 'OpenID Connect',
        category: 'oidc',
        status: 'planned',
        protocol: 'oidc',
        entryPath: '/api/auth/oidc',
        tenantConfigurationRequired: true,
        notes: 'Placeholder endpoint exists; issuer discovery, client registration, and callback handling are planned.',
        capabilities: ['issuer-discovery-planned', 'authorization-code-flow-planned', 'jwks-validation-planned'],
      },
      {
        id: 'azure-ad',
        name: 'Azure AD / Microsoft Entra ID',
        category: 'oidc',
        status: 'planned',
        protocol: 'oidc',
        entryPath: '/api/auth/oidc',
        tenantConfigurationRequired: true,
        notes: 'Prepared as an OIDC preset for Microsoft Entra ID tenant configuration.',
        capabilities: ['oidc-preset-planned', 'tenant-id-planned', 'group-claims-planned'],
      },
      {
        id: 'okta',
        name: 'Okta',
        category: 'sso',
        status: 'planned',
        protocol: 'oidc-or-saml',
        entryPath: null,
        tenantConfigurationRequired: true,
        notes: 'Prepared for Okta OIDC or SAML tenant-specific configuration.',
        capabilities: ['okta-oidc-planned', 'okta-saml-planned', 'group-mapping-planned'],
      },
      {
        id: 'google-workspace',
        name: 'Google Workspace',
        category: 'directory',
        status: googleConfigured ? 'supported' : 'planned',
        protocol: 'oauth2',
        entryPath: '/api/auth/google',
        tenantConfigurationRequired: false,
        notes: googleConfigured
          ? 'Google OAuth is configured; Workspace domain enforcement can be layered through tenant policy.'
          : 'Google OAuth route exists, but credentials are not configured for this environment.',
        capabilities: [
          'google-oauth-login',
          googleConfigured ? 'configured' : 'configuration-required',
          'workspace-domain-policy-planned',
        ],
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      statuses: ['supported', 'planned', 'unavailable'] as IdentityProviderStatus[],
      providers,
      summary: {
        supported: providers.filter((provider) => provider.status === 'supported').length,
        planned: providers.filter((provider) => provider.status === 'planned').length,
        unavailable: providers.filter((provider) => provider.status === 'unavailable').length,
      },
    };
  }
}
