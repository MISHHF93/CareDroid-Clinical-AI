import { PlatformAssetsApi } from './platformAssetsApi';

function disabled(message) {
  return { ok: false, data: null, message };
}

export async function fetchSuccessCenterDashboard(organizationId, period = 'month') {
  if (!organizationId) {
    return disabled('A tenant organization is required before loading the success center.');
  }

  try {
    const data = await PlatformAssetsApi.getCustomerSuccessDashboard(organizationId, period);
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(error?.message || 'Success center metrics are unavailable.');
  }
}

export default {
  fetchSuccessCenterDashboard,
};
