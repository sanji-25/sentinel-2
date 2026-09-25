import crypto from 'crypto';
import { Session, CreateSessionInput } from '@sentinel/shared';
import { SessionRepository, sessionRepository } from './repository.js';
import { AgentRepository, agentRepository } from '../agents/repository.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BadRequestError
} from '../../middleware/errorHandler.js';

export class SessionService {
  constructor(
    private sessionRepo: SessionRepository = sessionRepository,
    private agentRepo: AgentRepository = agentRepository
  ) {}

  async createSession(input: CreateSessionInput): Promise<Session> {
    if (!input || !input.agentId || typeof input.agentId !== 'string' || input.agentId.trim().length === 0) {
      throw new ValidationError('agentId is required to create a session');
    }

    const agentId = input.agentId.trim();
    const agent = await this.agentRepo.findById(agentId);

    if (!agent) {
      throw new NotFoundError(`The specified agent '${agentId}' does not exist`, 'AGENT_NOT_FOUND');
    }

    if (agent.status === 'REVOKED') {
      throw new ForbiddenError(`Cannot create session for revoked agent '${agentId}'`, 'AGENT_REVOKED');
    }

    if (agent.status === 'SUSPENDED') {
      throw new ForbiddenError(`Cannot create session for suspended agent '${agentId}'`, 'AGENT_SUSPENDED');
    }

    const idSuffix = crypto.randomBytes(6).toString('hex');
    const sessionId = `sess_${idSuffix}`;

    const session: Session = {
      id: sessionId,
      agentId: agent.id,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      currentRisk: 0,
      trajectoryDeviation: 0,
      actionCount: 0,
      metadata: input.metadata || {}
    };

    return this.sessionRepo.create(session);
  }

  async getSession(id: string): Promise<Session> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Session ID is required');
    }

    const session = await this.sessionRepo.findById(id);
    if (!session) {
      throw new NotFoundError(`The specified session '${id}' does not exist`, 'SESSION_NOT_FOUND');
    }

    return session;
  }

  async listSessions(agentId?: string): Promise<Session[]> {
    if (agentId) {
      return this.sessionRepo.findByAgentId(agentId);
    }
    return this.sessionRepo.findAll();
  }

  async endSession(id: string): Promise<Session> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Session ID is required');
    }

    const session = await this.sessionRepo.findById(id);
    if (!session) {
      throw new NotFoundError(`The specified session '${id}' does not exist`, 'SESSION_NOT_FOUND');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestError(`Session '${id}' has already been completed`, 'SESSION_ALREADY_COMPLETED');
    }

    if (session.status === 'REVOKED') {
      throw new BadRequestError(`Session '${id}' has been revoked`, 'SESSION_REVOKED');
    }

    session.status = 'COMPLETED';
    session.endedAt = new Date().toISOString();

    return this.sessionRepo.update(session);
  }
}

export const sessionService = new SessionService();
