/**
 * Sentinel 2.0 — Google Gemini External Agent Provider
 *
 * Implements ExternalAgentProvider using the official @google/generative-ai SDK.
 * Interacts with real Gemini models and enforces strict output validation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExternalAgentProvider, AgentTaskContext, ProposedAction } from '../types.js';
import { validateProposedAction, ActionValidationError } from '../validator.js';

export class GeminiAgentProvider implements ExternalAgentProvider {
  readonly id = 'gemini-provider';
  readonly name = 'Google Gemini';
  readonly modelName: string;
  private apiKey?: string;
  private client: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string, modelName?: string) {
    const rawKey = apiKey !== undefined ? apiKey : process.env.GEMINI_API_KEY;
    this.apiKey = rawKey && rawKey.trim().length > 0 && rawKey !== 'your_gemini_api_key_here'
      ? rawKey.trim()
      : undefined;

    this.modelName = modelName || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.client);
  }

  async initialize(_config?: Record<string, unknown>): Promise<void> {
    if (!this.isConfigured) {
      const rawKey = process.env.GEMINI_API_KEY;
      if (rawKey && rawKey.trim().length > 0 && rawKey !== 'your_gemini_api_key_here') {
        this.apiKey = rawKey.trim();
        this.client = new GoogleGenerativeAI(this.apiKey);
      }
    }
  }

  async generateNextAction(context: AgentTaskContext): Promise<ProposedAction> {
    if (!this.isConfigured || !this.client) {
      throw new Error(
        'GeminiProvider is not configured with a valid GEMINI_API_KEY. Configure GEMINI_API_KEY or use MockProvider.'
      );
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const pastActionsSummary = context.actionHistory.map((item) => ({
      step: item.step,
      action: item.action.action,
      resource: item.action.resource,
      scope: item.action.scope,
      decision: item.decision,
      reasons: item.decisionReasons,
      risk: item.risk
    }));

    const systemPrompt = `You are an autonomous AI research and operational agent interacting with a protected computing environment governed at runtime by Sentinel 2.0.

Your objective: "${context.taskPrompt}"

Current step: ${context.stepIndex + 1}
Past action history:
${JSON.stringify(pastActionsSummary, null, 2)}

You must propose the NEXT single discrete action required to advance your objective.
Every proposed action is reviewed by Sentinel 2.0 before execution.

You MUST respond ONLY with a JSON object conforming strictly to this schema:
{
  "action": "READ" | "WRITE" | "UPDATE" | "DELETE" | "EXECUTE" | "EXPORT" | "DOWNLOAD" | "PRIVILEGE_ESCALATION" | "EXTERNAL_REQUEST",
  "tool": "get_customer" | "get_order" | "update_order" | "issue_refund" | "request_admin_access" | "delete_customer",
  "resource": "identifier of target customer, order, financial record, or cluster",
  "resourceType": "customer_record" | "order_record" | "financial_transaction" | "document" | "database",
  "scope": "customer.read" | "order.read" | "order.write" | "finance.refund" | "admin.escalate" | "customer.delete",
  "sensitivity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reversibility": "REVERSIBLE" | "PARTIALLY_REVERSIBLE" | "IRREVERSIBLE",
  "reason": "Clear justification explaining why this action is required for your task"
}

Do not include any conversational filler. Return only valid JSON.`;

    let lastError: Error | null = null;
    const candidateModels = Array.from(new Set([this.modelName, 'gemini-flash-latest']));

    for (const targetModel of candidateModels) {
      const model = this.client.getGenerativeModel({
        model: targetModel,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await model.generateContent(systemPrompt);
          const rawText = result.response.text();

          // Validate model output with zero-trust validation
          return validateProposedAction(rawText);
        } catch (err: unknown) {
          if (err instanceof ActionValidationError) {
            throw err;
          }
          lastError = err as Error;
          const msg = (err as Error).message || '';
          if ((msg.includes('503') || msg.includes('429') || msg.includes('high demand')) && attempt < 1) {
            console.warn(`[GeminiProvider] ${targetModel} attempt ${attempt + 1} high demand, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          break; // proceed to next candidate model
        }
      }
    }

    throw new Error(`Gemini model generation failed: ${lastError?.message || 'Unknown error'}`);
  }
}
