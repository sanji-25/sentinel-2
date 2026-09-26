import { agentService } from './modules/agents/service.js';
import { sessionService } from './modules/sessions/service.js';
import { Agent, Session } from '@sentinel/shared';
import { config } from './config/index.js';

export const CANONICAL_AGENT_NAME = 'Gemini Research Agent';
export const CANONICAL_AGENT_TYPE = 'external-ai-agent';
export const CANONICAL_AGENT_SCOPES = ['project.read', 'project.write', 'source.read'];

export interface BootstrapResult {
  agent: Agent;
  session: Session;
  isNewAgent: boolean;
  isNewSession: boolean;
}

/**
 * Idempotently bootstraps the canonical external Gemini agent and an active session.
 * 1. Checks existing agents: if an agent with name CANONICAL_AGENT_NAME exists, reuse it;
 *    otherwise creates ONE canonical external agent.
 * 2. Checks existing sessions for that agent: if an ACTIVE session exists, reuse it;
 *    otherwise creates ONE active session.
 */
export async function bootstrapSystem(): Promise<BootstrapResult | null> {
  // Never run automatic bootstrapping in test environment to preserve unit test isolation
  if (config.env === 'test') {
    return null;
  }

  try {
    const existingAgents = await agentService.listAgents();
    let agent = existingAgents.find(
      (a) => a.name === CANONICAL_AGENT_NAME && a.status === 'ACTIVE'
    ) || existingAgents.find((a) => a.name === CANONICAL_AGENT_NAME);

    let isNewAgent = false;
    if (!agent) {
      agent = await agentService.registerAgent({
        name: CANONICAL_AGENT_NAME,
        type: CANONICAL_AGENT_TYPE,
        scopes: CANONICAL_AGENT_SCOPES,
        metadata: {
          principal: 'gemini-agent@external.sentinel',
          task: 'Financial audit and repository inspection',
          provider: 'gemini',
          model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
          isCanonical: true
        }
      });
      isNewAgent = true;
      console.log(`[Bootstrap] Registered canonical external agent: ${agent.name} (${agent.id})`);
    } else {
      console.log(`[Bootstrap] Reusing existing agent: ${agent.name} (${agent.id})`);
    }

    const existingSessions = await sessionService.listSessions(agent.id);
    let session = existingSessions.find((s) => s.status === 'ACTIVE');

    let isNewSession = false;
    if (!session) {
      session = await sessionService.createSession({
        agentId: agent.id,
        metadata: {
          task: 'Financial audit and repository inspection',
          principal: 'gemini-agent@external.sentinel',
          scopes: CANONICAL_AGENT_SCOPES,
          isCanonical: true
        }
      });
      isNewSession = true;
      console.log(`[Bootstrap] Created active session: ${session.id} for agent ${agent.id}`);
    } else {
      console.log(`[Bootstrap] Reusing active session: ${session.id} for agent ${agent.id}`);
    }

    return {
      agent,
      session,
      isNewAgent,
      isNewSession
    };
  } catch (err) {
    console.error('[Bootstrap] Error during system bootstrap:', (err as Error).message);
    throw err;
  }
}
