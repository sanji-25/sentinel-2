import { ActionEvent } from '@sentinel/shared';

export interface ActionEventRepository {
  findById(eventId: string): Promise<ActionEvent | null>;
  findBySessionId(sessionId: string): Promise<ActionEvent[]>;
  findByAgentId(agentId: string): Promise<ActionEvent[]>;
  findAll(): Promise<ActionEvent[]>;
  create(event: ActionEvent): Promise<ActionEvent>;
  clear?(): Promise<void>;
}

export class InMemoryActionEventRepository implements ActionEventRepository {
  private events: Map<string, ActionEvent> = new Map();

  async findById(eventId: string): Promise<ActionEvent | null> {
    const event = this.events.get(eventId);
    return event ? { ...event } : null;
  }

  async findBySessionId(sessionId: string): Promise<ActionEvent[]> {
    return Array.from(this.events.values())
      .filter((e) => e.sessionId === sessionId)
      .map((e) => ({ ...e }));
  }

  async findByAgentId(agentId: string): Promise<ActionEvent[]> {
    return Array.from(this.events.values())
      .filter((e) => e.agentId === agentId)
      .map((e) => ({ ...e }));
  }

  async findAll(): Promise<ActionEvent[]> {
    return Array.from(this.events.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((e) => ({ ...e }));
  }

  async create(event: ActionEvent): Promise<ActionEvent> {
    const copy = { ...event };
    this.events.set(event.eventId, copy);
    return { ...copy };
  }

  async clear(): Promise<void> {
    this.events.clear();
  }
}

export const actionEventRepository = new InMemoryActionEventRepository();
