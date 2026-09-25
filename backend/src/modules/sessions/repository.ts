import { Session } from '@sentinel/shared';

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByAgentId(agentId: string): Promise<Session[]>;
  findAll(): Promise<Session[]>;
  create(session: Session): Promise<Session>;
  update(session: Session): Promise<Session>;
  clear?(): Promise<void>;
}

export class InMemorySessionRepository implements SessionRepository {
  private sessions: Map<string, Session> = new Map();

  async findById(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    return session ? { ...session } : null;
  }

  async findByAgentId(agentId: string): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter((s) => s.agentId === agentId)
      .map((s) => ({ ...s }));
  }

  async findAll(): Promise<Session[]> {
    return Array.from(this.sessions.values()).map((s) => ({ ...s }));
  }

  async create(session: Session): Promise<Session> {
    const copy = { ...session };
    this.sessions.set(session.id, copy);
    return { ...copy };
  }

  async update(session: Session): Promise<Session> {
    const copy = { ...session };
    this.sessions.set(session.id, copy);
    return { ...copy };
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }
}

export const sessionRepository = new InMemorySessionRepository();
