import crypto from 'crypto';
import {
  ActionEvent,
  ActionType,
  ActionSensitivity,
  ActionReversibility,
  IngestActionInput,
  IngestActionResult,
  PolicyDecision
} from '@sentinel/shared';
import { ActionEventRepository, actionEventRepository } from './repository.js';
import { AgentRepository, agentRepository } from '../agents/repository.js';
import { SessionRepository, sessionRepository } from '../sessions/repository.js';
import { ScopeAuthorizationService, scopeAuthorizationService } from '../authorization/service.js';
import { PolicyDecisionService, policyDecisionService } from '../decisions/policy.service.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BadRequestError
} from '../../middleware/errorHandler.js';

const VALID_ACTIONS: Set<string> = new Set([
  'READ',
  'WRITE',
  'UPDATE',
  'DELETE',
  'EXECUTE',
  'EXPORT',
  'DOWNLOAD',
  'PRIVILEGE_ESCALATION',
  'EXTERNAL_REQUEST'
]);

const VALID_SENSITIVITIES: Set<string> = new Set([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
]);

const VALID_REVERSIBILITIES: Set<string> = new Set([
  'REVERSIBLE',
  'PARTIALLY_REVERSIBLE',
  'IRREVERSIBLE'
]);

export class ActionIngestionService {
  constructor(
    private actionRepo: ActionEventRepository = actionEventRepository,
    private agentRepo: AgentRepository = agentRepository,
    private sessionRepo: SessionRepository = sessionRepository,
    private authzService: ScopeAuthorizationService = scopeAuthorizationService,
    private policyService: PolicyDecisionService = policyDecisionService
  ) {}

  async ingestAction(input: IngestActionInput, requestId = '-'): Promise<IngestActionResult> {
    // 1. Validate payload existence
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Action payload is required');
    }

    // 2. Validate agentId
    if (!input.agentId || typeof input.agentId !== 'string' || input.agentId.trim().length === 0) {
      throw new ValidationError('agentId is required and must be a non-empty string');
    }
    const agentId = input.agentId.trim();

    // 3. Validate sessionId
    if (!input.sessionId || typeof input.sessionId !== 'string' || input.sessionId.trim().length === 0) {
      throw new ValidationError('sessionId is required and must be a non-empty string');
    }
    const sessionId = input.sessionId.trim();

    // 4. Validate action
    if (!input.action || typeof input.action !== 'string') {
      throw new ValidationError('action is required and must be a string');
    }
    const normalizedAction = input.action.trim().toUpperCase() as ActionType;
    if (!VALID_ACTIONS.has(normalizedAction)) {
      throw new ValidationError(
        `Invalid action '${input.action}'. Supported actions: ${Array.from(VALID_ACTIONS).join(', ')}`
      );
    }

    // 5. Validate resource & resourceType
    if (!input.resource || typeof input.resource !== 'string' || input.resource.trim().length === 0) {
      throw new ValidationError('resource is required and must be a non-empty string');
    }
    const resource = input.resource.trim();
    const resourceType = input.resourceType && typeof input.resourceType === 'string'
      ? input.resourceType.trim()
      : 'resource';

    // 6. Validate scope
    if (!input.scope || typeof input.scope !== 'string' || input.scope.trim().length === 0) {
      throw new ValidationError('scope is required and must be a non-empty string');
    }
    const scope = input.scope.trim();

    // 7. Validate sensitivity
    if (!input.sensitivity || typeof input.sensitivity !== 'string') {
      throw new ValidationError('sensitivity is required and must be a string');
    }
    const normalizedSensitivity = input.sensitivity.trim().toUpperCase() as ActionSensitivity;
    if (!VALID_SENSITIVITIES.has(normalizedSensitivity)) {
      throw new ValidationError(
        `Invalid sensitivity '${input.sensitivity}'. Supported: ${Array.from(VALID_SENSITIVITIES).join(', ')}`
      );
    }

    // 8. Validate reversibility
    if (!input.reversibility || typeof input.reversibility !== 'string') {
      throw new ValidationError('reversibility is required and must be a string');
    }
    const normalizedReversibility = input.reversibility.trim().toUpperCase() as ActionReversibility;
    if (!VALID_REVERSIBILITIES.has(normalizedReversibility)) {
      throw new ValidationError(
        `Invalid reversibility '${input.reversibility}'. Supported: ${Array.from(VALID_REVERSIBILITIES).join(', ')}`
      );
    }

    // 9. Verify Agent exists and is ACTIVE
    const agent = await this.agentRepo.findById(agentId);
    if (!agent) {
      throw new NotFoundError(`The specified agent '${agentId}' does not exist`, 'AGENT_NOT_FOUND');
    }
    if (agent.status === 'REVOKED') {
      throw new ForbiddenError(`Agent '${agentId}' is revoked and cannot perform actions`, 'AGENT_REVOKED');
    }
    if (agent.status === 'SUSPENDED') {
      throw new ForbiddenError(`Agent '${agentId}' is suspended and cannot perform actions`, 'AGENT_SUSPENDED');
    }

    // 10. Verify Session exists, belongs to the Agent, and is ACTIVE
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`The specified session '${sessionId}' does not exist`, 'SESSION_NOT_FOUND');
    }
    if (session.agentId !== agent.id) {
      throw new BadRequestError(
        `Session '${sessionId}' belongs to agent '${session.agentId}', not '${agent.id}'`,
        'SESSION_AGENT_MISMATCH'
      );
    }
    if (session.status === 'COMPLETED') {
      throw new BadRequestError(
        `Session '${sessionId}' has completed. Cannot accept new actions.`,
        'SESSION_ALREADY_COMPLETED'
      );
    }
    if (session.status === 'REVOKED') {
      throw new BadRequestError(
        `Session '${sessionId}' has been revoked. Cannot accept new actions.`,
        'SESSION_REVOKED'
      );
    }

    // 11. Resolve Timestamp
    const timestamp = input.timestamp && !isNaN(Date.parse(input.timestamp))
      ? new Date(input.timestamp).toISOString()
      : new Date().toISOString();

    // 12. Determine Authorization independently using agent's registered scopes
    const isAuthorized = this.authzService.isAuthorized(agent.scopes, scope);
    const authorization = isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED';

    // 13. Create Unique Event ID
    const eventId = `evt_${crypto.randomBytes(8).toString('hex')}`;

    const actionEvent: ActionEvent = {
      eventId,
      agentId: agent.id,
      sessionId: session.id,
      timestamp,
      action: normalizedAction,
      resource,
      resourceType,
      scope,
      sensitivity: normalizedSensitivity,
      reversibility: normalizedReversibility,
      authorization,
      metadata: input.metadata || {}
    };

    // 14. Record Action Event
    await this.actionRepo.create(actionEvent);

    // Update session action count
    session.actionCount = (session.actionCount || 0) + 1;
    await this.sessionRepo.update(session);

    // 15. Produce Basic Policy Decision
    const decision: PolicyDecision = this.policyService.evaluate({
      event: actionEvent,
      agentName: agent.name
    });

    // 16. Structured Log of Action Ingestion
    console.log(
      `[ACTION_INGESTION] [${requestId}] agentId=${agent.id} sessionId=${session.id} eventId=${eventId} action=${normalizedAction} resource=${resource} authz=${authorization} decision=${decision.action}`
    );

    return {
      event: actionEvent,
      decision
    };
  }

  async getAction(eventId: string): Promise<ActionEvent> {
    if (!eventId || typeof eventId !== 'string') {
      throw new ValidationError('Event ID is required');
    }

    const event = await this.actionRepo.findById(eventId);
    if (!event) {
      throw new NotFoundError(`The specified action event '${eventId}' does not exist`, 'EVENT_NOT_FOUND');
    }
    return event;
  }

  async listActions(sessionId?: string, agentId?: string): Promise<ActionEvent[]> {
    if (sessionId) {
      return this.actionRepo.findBySessionId(sessionId);
    }
    if (agentId) {
      return this.actionRepo.findByAgentId(agentId);
    }
    return this.actionRepo.findAll();
  }
}

export const actionIngestionService = new ActionIngestionService();
