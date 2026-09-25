/**
 * Audit Trail Domain Types for Sentinel 2.0
 * Append-only security audit log definitions
 */

export type AuditEventType =
  | 'AGENT_CREATED'
  | 'AGENT_SUSPENDED'
  | 'AGENT_REVOKED'
  | 'SESSION_STARTED'
  | 'SESSION_COMPLETED'
  | 'ACTION_INGESTED'
  | 'ACTION_ALLOWED'
  | 'ACTION_MONITORED'
  | 'ACTION_WARNED'
  | 'ACTION_CONFIRM_REQUIRED'
  | 'ACTION_BLOCKED'
  | 'INTERVENTION_TRIGGERED'
  | 'HUMAN_REVIEW_RESOLVED';

export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  entityType: 'agent' | 'session' | 'action' | 'system' | 'intervention';
  entityId: string;
  sessionId?: string;
  actor: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAuditLogInput {
  eventType: AuditEventType;
  entityType: 'agent' | 'session' | 'action' | 'system' | 'intervention';
  entityId: string;
  sessionId?: string;
  actor?: string;
  payload?: Record<string, unknown>;
}

export interface PersistenceStatus {
  provider: 'supabase' | 'local-storage' | 'memory';
  connected: boolean;
  status: 'connected' | 'degraded' | 'fallback' | 'unavailable';
  details?: string;
}
