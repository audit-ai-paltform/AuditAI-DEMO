import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
  tenantId?: string;
  userId?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestStore>();

export function getRequestContext(): RequestStore | undefined {
  return requestContextStore.getStore();
}

export function getRequestId(): string {
  return requestContextStore.getStore()?.requestId || 'unknown-context';
}
