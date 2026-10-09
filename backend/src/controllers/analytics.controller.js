import { getAdminAnalytics } from '../services/analytics.service.js';

export async function getAdminDashboard(_request, response, next) {
  try {
    const data = await getAdminAnalytics();
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
