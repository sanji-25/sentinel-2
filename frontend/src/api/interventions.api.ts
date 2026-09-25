import {
  PendingInterventionRecord,
  HumanDecisionPayload,
  SessionInterventionResponse,
  RiskForecast,
  CounterfactualAnalysis
} from '@sentinel/shared';

const API_BASE = '/api/v1';

export const interventionsApi = {
  /**
   * Lists pending human review interventions
   */
  async listPending(): Promise<PendingInterventionRecord[]> {
    const res = await fetch(`${API_BASE}/interventions?status=PENDING`);
    if (!res.ok) {
      throw new Error(`Failed to fetch pending interventions: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || json.interventions || [];
  },

  /**
   * Lists all interventions with optional status filter
   */
  async listAll(status?: string): Promise<PendingInterventionRecord[]> {
    const url = status
      ? `${API_BASE}/interventions?status=${encodeURIComponent(status)}`
      : `${API_BASE}/interventions`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch interventions: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || json.interventions || [];
  },

  /**
   * Retrieves single intervention details by ID
   */
  async getById(id: string): Promise<PendingInterventionRecord> {
    const res = await fetch(`${API_BASE}/interventions/${encodeURIComponent(id)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch intervention ${id}: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || json;
  },

  /**
   * Submits a human decision (ALLOW_ONCE, DENY, REVOKE_SESSION)
   */
  async submitDecision(
    id: string,
    payload: HumanDecisionPayload
  ): Promise<PendingInterventionRecord> {
    const res = await fetch(`${API_BASE}/interventions/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to submit decision: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || json;
  },

  /**
   * Gets intervention analysis for a session
   */
  async getSessionIntervention(sessionId: string): Promise<SessionInterventionResponse> {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/intervention`);
    if (!res.ok) {
      throw new Error(`Failed to fetch session intervention: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || json;
  },

  /**
   * Gets forward risk forecast for a session
   */
  async getSessionForecast(sessionId: string): Promise<RiskForecast> {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/forecast`);
    if (!res.ok) {
      throw new Error(`Failed to fetch session forecast: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || json;
  },

  /**
   * Gets 3-path counterfactual simulation for a session
   */
  async getSessionCounterfactual(sessionId: string): Promise<CounterfactualAnalysis> {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/counterfactual`);
    if (!res.ok) {
      throw new Error(`Failed to fetch counterfactual: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || json;
  }
};
