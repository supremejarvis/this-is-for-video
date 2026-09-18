import { apiClient } from './client';

export interface CircuitBreakerStatus {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failure_count: number;
  success_count: number;
  failure_threshold: number;
  recovery_timeout_sec: number;
  remaining_cooldown_sec: number;
}

export interface BackgroundWorkersStatus {
  outbox_worker: {
    running: boolean;
    processed_events: number;
    last_run: string | null;
  };
  quote_cleanup_worker: {
    running: boolean;
    pruned_quotes: number;
    last_run: string | null;
  };
}

export interface CacheStatus {
  name: string;
  size: number;
  max_size: number;
  hits: number;
  misses: number;
  hit_ratio_percent: number;
  evictions: number;
}

export interface SystemStatusResponse {
  status: string;
  server_time: string;
  circuit_breakers: CircuitBreakerStatus[];
  background_workers: BackgroundWorkersStatus;
  load_optimizer_caches: CacheStatus[];
}

export class SystemApi {
  private basePath = '/system';

  async getStatus(): Promise<SystemStatusResponse> {
    return apiClient.get<SystemStatusResponse>(`${this.basePath}/status`);
  }
}

export const systemApi = new SystemApi();
