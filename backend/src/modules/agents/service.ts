import crypto from 'crypto';
import { Agent, CreateAgentInput } from '@sentinel/shared';
import { AgentRepository, agentRepository } from './repository.js';
import { ValidationError, NotFoundError } from '../../middleware/errorHandler.js';

export class AgentService {
  constructor(private repo: AgentRepository = agentRepository) {}

  async registerAgent(input: CreateAgentInput): Promise<Agent> {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Agent registration payload is required');
    }

    if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
      throw new ValidationError('Agent name is required and must be a non-empty string');
    }

    if (!Array.isArray(input.scopes)) {
      throw new ValidationError('Agent scopes must be an array of string permissions');
    }

    for (const scope of input.scopes) {
      if (typeof scope !== 'string' || scope.trim().length === 0) {
        throw new ValidationError('Each scope in scopes must be a non-empty string');
      }
    }

    const type = input.type && typeof input.type === 'string' && input.type.trim().length > 0
      ? input.type.trim()
      : 'external-ai-agent';

    const idSuffix = crypto.randomBytes(4).toString('hex');
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    const id = `${slug || 'agent'}-${idSuffix}`;

    const agent: Agent = {
      id,
      name: input.name.trim(),
      type,
      status: 'ACTIVE',
      scopes: [...input.scopes],
      createdAt: new Date().toISOString(),
      metadata: input.metadata || {}
    };

    return this.repo.create(agent);
  }

  async getAgent(id: string): Promise<Agent> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Agent ID is required');
    }

    const agent = await this.repo.findById(id);
    if (!agent) {
      throw new NotFoundError(`The specified agent '${id}' does not exist`, 'AGENT_NOT_FOUND');
    }
    return agent;
  }

  async listAgents(): Promise<Agent[]> {
    return this.repo.findAll();
  }
}

export const agentService = new AgentService();
