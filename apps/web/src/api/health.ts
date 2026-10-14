import { apiClient } from './client';

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health', { signal });
  return data;
}

export async function getReadiness(
  signal?: AbortSignal,
): Promise<HealthResponse & { database: 'up' }> {
  const { data } = await apiClient.get<HealthResponse & { database: 'up' }>('/health/ready', {
    signal,
  });
  return data;
}
