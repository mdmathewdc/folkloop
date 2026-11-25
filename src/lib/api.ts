import type {
  FeedVillagerRequest,
  FeedVillagerResult,
  VillagerEventRecord,
  VillagerState,
  WorkflowInspectorInfo,
} from './types';

export interface VillagerStateResponse {
  state: VillagerState;
  source: 'temporal_query' | 'postgres_snapshot';
  workerOnline: boolean;
  warning?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      data?.message ?? `Request failed with status ${res.status}`,
      res.status,
      data?.error,
    );
  }
  return data as T;
}

export async function fetchBobState(): Promise<VillagerStateResponse> {
  return requestJson<VillagerStateResponse>('/api/villagers/bob/state');
}

export async function fetchBobEvents(limit = 40): Promise<VillagerEventRecord[]> {
  const data = await requestJson<{ events: VillagerEventRecord[] }>(
    `/api/villagers/bob/events?limit=${limit}`,
  );
  return data.events;
}

export async function fetchBobInspector(): Promise<WorkflowInspectorInfo> {
  const data = await requestJson<{ inspector: WorkflowInspectorInfo }>(
    '/api/villagers/bob/inspector',
  );
  return data.inspector;
}

export async function feedBob(req?: FeedVillagerRequest): Promise<FeedVillagerResult> {
  return requestJson<FeedVillagerResult>('/api/villagers/bob/feed', {
    method: 'POST',
    body: JSON.stringify(req ?? {}),
  });
}

export async function wakeBob(reason?: string): Promise<{ accepted: boolean; message: string }> {
  return requestJson<{ accepted: boolean; message: string }>('/api/villagers/bob/wake', {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export async function stealBobBread(payload?: {
  thief?: string;
  loaves?: number;
}): Promise<{ accepted: boolean; message: string }> {
  return requestJson<{ accepted: boolean; message: string }>('/api/villagers/bob/steal-bread', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}
