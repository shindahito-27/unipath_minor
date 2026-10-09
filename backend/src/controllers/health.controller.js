import { getHealthStatus } from '../services/health.service.js';

export function getHealth(_request, response) {
  response.json(getHealthStatus());
}
