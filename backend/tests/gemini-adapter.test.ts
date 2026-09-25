/**
 * Sentinel 2.0 — Phase 7: Gemini Agent Adapter Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../src/app.js';
import { GeminiSentinelAdapter } from '../../scripts/gemini-agent/adapter.js';
import { GeminiAgentRunner } from '../../scripts/gemini-agent/gemini-agent.js';
import { translateToolToActionEvent } from '../../scripts/gemini-agent/tools.js';
import { agentRepository } from '../src/modules/agents/repository.js';
import { sessionRepository } from '../src/modules/sessions/repository.js';
import { actionEventRepository } from '../src/modules/actions/repository.js';

describe('Gemini Sentinel Adapter & Runtime Governance (Phase 7)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    if (agentRepository.clear) await agentRepository.clear();
    if (sessionRepository.clear) await sessionRepository.clear();
    if (actionEventRepository.clear) await actionEventRepository.clear();
  });

  it('1. Gemini adapter can initialize session and register agent', async () => {
    const adapter = new GeminiSentinelAdapter({
      sentinelBaseUrl: baseUrl,
      agentName: 'Test Gemini Assistant',
      grantedScopes: ['project.read', 'project.write', 'source.read']
    });

    const init = await adapter.initialize();

    expect(init.agent).toBeDefined();
    expect(init.agent.id).toBeDefined();
    expect(init.agent.name).toBe('Test Gemini Assistant');
    expect(init.agent.status).toBe('ACTIVE');
    expect(init.session).toBeDefined();
    expect(init.session.id).toBeDefined();
    expect(init.session.status).toBe('ACTIVE');

    await adapter.close();
  });

  it('2. Action translation works for governed Gemini tools', () => {
    const payload = translateToolToActionEvent(
      'read_project_docs',
      { docPath: 'docs://sentinel/spec.md' },
      'agent-123',
      'sess-456'
    );

    expect(payload.agentId).toBe('agent-123');
    expect(payload.sessionId).toBe('sess-456');
    expect(payload.action).toBe('READ');
    expect(payload.resource).toBe('docs://sentinel/spec.md');
    expect(payload.scope).toBe('project.read');
    expect(payload.sensitivity).toBe('LOW');
    expect(payload.reversibility).toBe('REVERSIBLE');
  });

  it('3. Sentinel ALLOW continues execution for authorized low-risk action', async () => {
    const adapter = new GeminiSentinelAdapter({
      sentinelBaseUrl: baseUrl,
      grantedScopes: ['project.read', 'source.read']
    });

    await adapter.initialize();

    const result = await adapter.evaluateAndExecuteTool('READ_PROJECT_DOCS', {
      docPath: 'docs://sentinel/architecture-spec'
    });

    expect(result.allowed).toBe(true);
    expect(result.decision).toBe('ALLOW');
    expect(result.stepLog.executionAllowed).toBe(true);
    expect(result.toolOutput).toBeDefined();
    expect(result.toolOutput?.status).toBe('SUCCESS');

    await adapter.close();
  });

  it('4. Sentinel MONITOR continues execution for medium sensitivity operation', async () => {
    const adapter = new GeminiSentinelAdapter({
      sentinelBaseUrl: baseUrl,
      grantedScopes: ['project.read', 'project.write', 'source.read']
    });

    await adapter.initialize();

    const result = await adapter.evaluateAndExecuteTool('WRITE_REPORT', {
      title: 'Synthesis Note',
      content: 'Telemetry evaluation'
    });

    expect(result.allowed).toBe(true);
    expect(result.decision).toBe('MONITOR');
    expect(result.stepLog.executionAllowed).toBe(true);
    expect(result.toolOutput).toBeDefined();

    await adapter.close();
  });

  it('5. Sentinel CONFIRM pauses execution and requests human review', async () => {
    const adapter = new GeminiSentinelAdapter({
      sentinelBaseUrl: baseUrl,
      grantedScopes: ['project.read'], // finance.read is unauthorized
      autoApproveConfirm: true,
      reviewerId: 'lead-secops-reviewer'
    });

    await adapter.initialize();

    const result = await adapter.evaluateAndExecuteTool('READ_FINANCE_DATA', {
      ledgerQuarter: '2026-Q3'
    });

    expect(result.decision).toBe('CONFIRM');
    expect(result.stepLog.humanReviewRequired).toBe(true);
    expect(result.stepLog.humanDecision).toBe('ALLOW_ONCE');
    expect(result.allowed).toBe(true);

    await adapter.close();
  });

  it('6. Sentinel BLOCK prevents execution of destructive unauthorized operations', async () => {
    const adapter = new GeminiSentinelAdapter({
      sentinelBaseUrl: baseUrl,
      grantedScopes: ['project.read']
    });

    await adapter.initialize();

    const result = await adapter.evaluateAndExecuteTool('DELETE_RESOURCE', {
      resourceUri: 'cluster://prod-us-east/primary-db',
      confirmation: true
    });

    expect(result.allowed).toBe(false);
    expect(result.decision).toBe('BLOCK');
    expect(adapter.isHalted()).toBe(true);
    expect(result.toolOutput).toBeUndefined();

    // Subsequent actions should be rejected because execution is halted
    await expect(
      adapter.evaluateAndExecuteTool('READ_PROJECT_DOCS')
    ).rejects.toThrow(/Execution is halted/);

    await adapter.close();
  });

  it('7. Missing Gemini key produces a clear error when not in demo mode', async () => {
    const runner = new GeminiAgentRunner({
      sentinelUrl: baseUrl,
      demoMode: false,
      geminiMode: true,
      apiKey: '' // Missing key
    });

    await expect(runner.run()).rejects.toThrow(
      /GEMINI_API_KEY is required for live Gemini mode/
    );
  });

  it('8. DEMO_MODE works deterministically without API key across 7 canonical steps', async () => {
    const runner = new GeminiAgentRunner({
      sentinelUrl: baseUrl,
      demoMode: true
    });

    expect(runner.getModeLabel()).toBe('DEMO MODE');
    const summary = await runner.run();

    expect(summary.mode).toBe('DEMO_MODE');
    expect(summary.totalSteps).toBe(7);
    expect(summary.steps[0].sentinelDecision).toBe('ALLOW');
    expect(summary.steps[1].sentinelDecision).toBe('ALLOW');
    expect(summary.steps[2].sentinelDecision).toBe('MONITOR');
    expect(summary.steps[3].sentinelDecision).toBe('CONFIRM');
    expect(summary.steps[4].sentinelDecision).toBe('CONFIRM');
    expect(summary.steps[5].sentinelDecision).toBe('CONFIRM');
    expect(summary.steps[6].sentinelDecision).toBe('BLOCK');
    expect(summary.executionHalted).toBe(true);
  });

  it('9. Human denial rejects action and sets executionAllowed to false', async () => {
    const adapter = new GeminiSentinelAdapter({
      sentinelBaseUrl: baseUrl,
      grantedScopes: ['project.read'],
      autoApproveConfirm: false // Simulates DENY
    });

    await adapter.initialize();

    const result = await adapter.evaluateAndExecuteTool('READ_FINANCE_DATA', {
      ledgerQuarter: '2026-Q3'
    });

    expect(result.decision).toBe('CONFIRM');
    expect(result.allowed).toBe(false);
    expect(result.stepLog.humanDecision).toBe('DENY');
    expect(result.stepLog.executionAllowed).toBe(false);

    await adapter.close();
  });

  it('10. Sentinel unavailable produces clean error without uncaught process crash', async () => {
    const unreachableClient = new GeminiSentinelAdapter({
      sentinelBaseUrl: 'http://127.0.0.1:59998/api/v1'
    });

    await expect(unreachableClient.initialize()).rejects.toThrow();
  });

  it('11. Gemini client configuration correctly configures models and modes', () => {
    const runner = new GeminiAgentRunner({
      sentinelUrl: baseUrl,
      modelName: 'gemini-1.5-pro',
      demoMode: true
    });

    expect(runner.getModeLabel()).toBe('DEMO MODE');
    expect(runner.isLiveGemini()).toBe(false);
  });
});
