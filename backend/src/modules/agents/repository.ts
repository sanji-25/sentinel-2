import { Agent } from '@sentinel/shared';

export interface AgentRepository {
  findById(id: string): Promise<Agent | null>;
  findAll(): Promise<Agent[]>;
  create(agent: Agent): Promise<Agent>;
  update(agent: Agent): Promise<Agent>;
  clear?(): Promise<void>; // for test isolation
}

export class InMemoryAgentRepository implements AgentRepository {
  private agents: Map<string, Agent> = new Map();

  async findById(id: string): Promise<Agent | null> {
    const agent = this.agents.get(id);
    return agent ? { ...agent } : null;
  }

  async findAll(): Promise<Agent[]> {
    return Array.from(this.agents.values()).map((agent) => ({ ...agent }));
  }

  async create(agent: Agent): Promise<Agent> {
    const copy = { ...agent };
    this.agents.set(agent.id, copy);
    return { ...copy };
  }

  async update(agent: Agent): Promise<Agent> {
    const copy = { ...agent };
    this.agents.set(agent.id, copy);
    return { ...copy };
  }

  async clear(): Promise<void> {
    this.agents.clear();
  }
}

// Default singleton repository
export const agentRepository = new InMemoryAgentRepository();
