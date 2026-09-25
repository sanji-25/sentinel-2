/**
 * Trajectory assessment tracking behavior over time
 */
export type TrajectoryPhase =
  | 'NORMAL_ACTIONS'
  | 'UNUSUAL_ACTIONS'
  | 'SCOPE_EXPANSION'
  | 'SENSITIVE_RESOURCE_ACCESS'
  | 'PRIVILEGE_ESCALATION'
  | 'POTENTIALLY_DESTRUCTIVE';

export interface TrajectoryAssessment {
  id: string;
  sessionId: string;
  currentPhase: TrajectoryPhase;
  deviationScore: number; // 0 - 100
  historicalBaselineMatch: number; // 0 - 100
  scopeExpansionDetected: boolean;
  unauthorizedAccessAttempted: boolean;
  timestamp: string;
  summary: string;
}
