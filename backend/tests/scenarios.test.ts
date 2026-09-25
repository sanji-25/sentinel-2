import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { agentRepository } from '../src/modules/agents/repository.js';
import { sessionRepository } from '../src/modules/sessions/repository.js';
import { actionEventRepository } from '../src/modules/actions/repository.js';
import { SCENARIO_DEFINITIONS, runScenario } from '../src/modules/scenarios/index.js';

describe('Deterministic Behavioral Scenarios', () => {
  beforeEach(async () => {
    if (agentRepository.clear) await agentRepository.clear();
    if (sessionRepository.clear) await sessionRepository.clear();
    if (actionEventRepository.clear) await actionEventRepository.clear();
  });

  it('provides 6 distinct deterministic scenarios', () => {
    expect(SCENARIO_DEFINITIONS).toHaveLength(6);
    const ids = SCENARIO_DEFINITIONS.map(s => s.id);
    expect(ids).toEqual([
      'NORMAL_RESEARCH',
      'GRADUAL_SCOPE_CREEP',
      'SENSITIVE_DATA_ACCESS',
      'PRIVILEGE_ESCALATION',
      'DESTRUCTIVE_SEQUENCE',
      'LEGITIMATE_UNUSUAL_BEHAVIOR'
    ]);
  });

  it('runs NORMAL_RESEARCH: remains stable with low deviation and low risk', async () => {
    const result = await runScenario('NORMAL_RESEARCH');
    expect(result.trajectory.state).toBe('NORMAL');
    expect(result.trajectory.currentRisk).toBeLessThanOrEqual(35);
    expect(result.trajectory.trajectoryDeviation).toBeLessThanOrEqual(35);
    expect(result.decisions.every(d => ['ALLOW', 'MONITOR'].includes(d.action))).toBe(true);
    expect(result.decisions.some(d => d.action === 'BLOCK')).toBe(false);
  });

  it('runs GRADUAL_SCOPE_CREEP: demonstrates increasing deviation and elevated state', async () => {
    const result = await runScenario('GRADUAL_SCOPE_CREEP');
    expect(['ESCALATING', 'CRITICAL', 'DRIFTING']).toContain(result.trajectory.state);
    expect(result.trajectory.trajectoryDeviation).toBeGreaterThanOrEqual(50);
    expect(result.trajectory.features.scopeExpansion).toBeGreaterThan(50);
  });

  it('runs SENSITIVE_DATA_ACCESS: sensitivity escalation yields elevated risk', async () => {
    const result = await runScenario('SENSITIVE_DATA_ACCESS');
    expect(result.trajectory.features.sensitivityEscalation).toBeGreaterThanOrEqual(80);
    expect(result.trajectory.currentRisk).toBeGreaterThan(60);
    expect(['ESCALATING', 'CRITICAL']).toContain(result.trajectory.state);
  });

  it('runs PRIVILEGE_ESCALATION: multiple unauthorized attempts trigger critical trajectory', async () => {
    const result = await runScenario('PRIVILEGE_ESCALATION');
    expect(result.trajectory.features.authorizationFailures).toBeGreaterThanOrEqual(50);
    expect(result.trajectory.state).toBe('CRITICAL');
  });

  it('runs DESTRUCTIVE_SEQUENCE: irreversible destructive actions produce max risk and critical state', async () => {
    const result = await runScenario('DESTRUCTIVE_SEQUENCE');
    expect(result.trajectory.features.destructiveActionPresence).toBe(100);
    expect(result.trajectory.currentRisk).toBeGreaterThan(70);
    expect(result.trajectory.state).toBe('CRITICAL');
  });

  it('runs LEGITIMATE_UNUSUAL_BEHAVIOR: unusual action does not trigger false positive BLOCK', async () => {
    const result = await runScenario('LEGITIMATE_UNUSUAL_BEHAVIOR');
    // Notice: deviation might be higher due to novelty/action type, but decisions remain non-blocked
    const blockedDecisions = result.decisions.filter(d => d.action === 'BLOCK');
    expect(blockedDecisions).toHaveLength(0);
    expect(result.trajectory.currentRisk).toBeLessThan(75);
  });

  describe('Scenario API endpoints', () => {
    it('GET /api/v1/scenarios returns all scenarios', async () => {
      const res = await request(app)
        .get('/api/v1/scenarios')
        .expect(200);

      expect(res.body.scenarios).toBeDefined();
      expect(res.body.scenarios).toHaveLength(6);
      expect(res.body.scenarios[0].id).toBe('NORMAL_RESEARCH');
    });

    it('POST /api/v1/scenarios/:id/run executes scenario via API', async () => {
      const res = await request(app)
        .post('/api/v1/scenarios/NORMAL_RESEARCH/run')
        .expect(200);

      expect(res.body.scenarioId).toBe('NORMAL_RESEARCH');
      expect(res.body.session).toBeDefined();
      expect(res.body.trajectory).toBeDefined();
      expect(res.body.trajectory.state).toBe('NORMAL');
      expect(res.body.actions).toHaveLength(4);
    });

    it('POST /api/v1/scenarios/invalid/run returns 404', async () => {
      await request(app)
        .post('/api/v1/scenarios/INVALID_SCENARIO_NAME/run')
        .expect(404);
    });
  });
});
