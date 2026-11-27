export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface ReadinessStatus extends HealthStatus {
  services: {
    system: 'up' | 'down';
    database?: 'up' | 'down';
    databaseLatencyMs?: number;
    storage?: 'up' | 'down';
    realtime?: 'up' | 'down';
  };
}
