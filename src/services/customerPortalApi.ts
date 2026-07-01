import { PlatformAssetsApi } from './platformAssetsApi';

function disabled(message) {
  return { ok: false, data: null, message };
}

export async function fetchCustomerPortalAdministration(organizationId) {
  if (!organizationId) {
    return disabled('A tenant organization is required before loading the customer portal.');
  }

  try {
    const data = await PlatformAssetsApi.getTenantAdministration(organizationId);
    return { ok: true, data, message: '' };
  } catch (error: any) {
    return disabled(error?.message || 'Customer portal administration is unavailable.');
  }
}

export default {
  fetchCustomerPortalAdministration,
};
