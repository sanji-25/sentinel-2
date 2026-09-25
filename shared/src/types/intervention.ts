/**
 * Intervention Intelligence and Window Assessment
 */
export type InterventionWindowStage =
  | 'TOO_EARLY'
  | 'MONITOR'
  | 'WARNING'
  | 'OPTIMAL_INTERVENTION_WINDOW'
  | 'CONFIRM'
  | 'TOO_LATE';

export interface InterventionAssessment {
  id: string;
  actionId: string;
  stage: InterventionWindowStage;
  confidence: number; // 0 - 100
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
  predictedHarmScore: number; // 0 - 100
  opportunityCostOfIntervention: number; // disruption to workflow
  recommendedAction: string;
  timestamp: string;
}
