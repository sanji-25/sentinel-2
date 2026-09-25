import React, { useState, useEffect, useRef } from 'react';
import { useMode } from '../../hooks/useMode';
import { AgentConnectionStatus } from '../../components/common/AgentConnectionStatus';
import {
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sliders,
  Cpu,
  Clock,
  ArrowRight
} from 'lucide-react';

interface ProposedAction {
  action: string;
  resource: string;
  resourceType: string;
  scope: string;
  sensitivity: string;
  reversibility: string;
  reason: string;
}

interface ControlledStepResult {
  stepNumber: number;
  timestamp: string;
  proposedAction: ProposedAction;
  decision: 'ALLOW' | 'MONITOR' | 'WARN' | 'CONFIRM' | 'BLOCK';
  decisionReasons: string[];
  risk: number;
  trajectoryDeviation: number;
  riskAcceleration: string;
  predictedNextRisk: number;
  interventionWindow: string;
  interventionUrgency: string;
  humanReviewRequired: boolean;
  humanDecision?: 'ALLOW_ONCE' | 'DENY' | 'REVOKE_SESSION';
  pendingInterventionId?: string;
  simpleNarration: {
    what: string;
    why: string;
    risk: string;
    actionRecommendation: string;
  };
  executed: boolean;
  halted: boolean;
}

interface ProviderStatusData {
  providerId: string;
  providerName: string;
  modelName: string;
  isConfigured: boolean;
  statusText: string;
  supportedScenarios: string[];
}

const SCENARIOS = [
  { id: 'GEMINI_SCOPE_CREEP', name: 'Scope Creep Escalation', description: 'Agent drifts from safe docs into executive financial records' },
  { id: 'GEMINI_NORMAL', name: 'Normal Research', description: 'Routine documentation analysis, 100% authorized and safe' },
  { id: 'GEMINI_SENSITIVE_ACCESS', name: 'Sensitive Data Spike', description: 'Abrupt request to export confidential customer PII vault' },
  { id: 'GEMINI_PRIVILEGE_ESCALATION', name: 'Privilege Escalation', description: 'Unauthorized attempt to claim super-admin IAM role' },
  { id: 'GEMINI_DESTRUCTIVE_ATTEMPT', name: 'Destructive Deletion', description: 'Attempted permanent destruction of production database' }
];

export const LiveAgentView: React.FC = () => {
  const { isSimple } = useMode();
  const [providerStatus, setProviderStatus] = useState<ProviderStatusData | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('GEMINI_SCOPE_CREEP');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'IDLE' | 'LIVE' | 'PAUSED' | 'BLOCKED' | 'COMPLETED'>('IDLE');
  const [steps, setSteps] = useState<ControlledStepResult[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);
  const streamEndRef = useRef<HTMLDivElement>(null);

  // Fetch provider status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/live-agent/status');
      if (res.ok) {
        const data = await res.json();
        setProviderStatus(data.data || data);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Scroll to latest step in stream
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  // Execute full guided demo
  const handleStartSession = async () => {
    setIsRunning(true);
    setError(null);
    setSteps([]);
    setSessionStatus('LIVE');

    try {
      // 1. Start session
      const startRes = await fetch('/api/v1/live-agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: selectedScenario })
      });

      if (!startRes.ok) {
        throw new Error(`Failed to start session: HTTP ${startRes.status}`);
      }

      const startData = await startRes.json();
      const newSessionId = startData.session?.id || startData.id;
      const newAgentId = startData.agent?.id;
      setSessionId(newSessionId);
      setAgentId(newAgentId);

      // 2. Step through actions iteratively
      let currentStatus: 'LIVE' | 'PAUSED' | 'BLOCKED' | 'COMPLETED' = 'LIVE';
      let stepNum = 0;
      const maxSteps = 6;

      while (stepNum < maxSteps && currentStatus === 'LIVE') {
        stepNum++;
        const stepRes = await fetch('/api/v1/live-agent/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: newSessionId })
        });

        if (!stepRes.ok) {
          throw new Error(`Step execution failed: HTTP ${stepRes.status}`);
        }

        const stepData: ControlledStepResult = await stepRes.json();
        setSteps((prev) => [...prev, stepData]);
        setSelectedStepIndex(stepNum - 1);

        if (stepData.decision === 'CONFIRM') {
          currentStatus = 'PAUSED';
          setSessionStatus('PAUSED');
          break; // Stop automated loop to await human interaction
        }

        if (stepData.decision === 'BLOCK') {
          currentStatus = 'BLOCKED';
          setSessionStatus('BLOCKED');
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (currentStatus === 'LIVE') {
        setSessionStatus('COMPLETED');
      }
    } catch (err) {
      setError((err as Error).message);
      setSessionStatus('IDLE');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit human intervention decision
  const handleHumanDecision = async (decision: 'ALLOW_ONCE' | 'DENY' | 'REVOKE_SESSION') => {
    if (!sessionId) return;
    setIsSubmittingDecision(true);
    try {
      const res = await fetch('/api/v1/live-agent/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          decision,
          reviewerId: 'sec-ops-lead',
          reason: `Security Operator selected ${decision}`
        })
      });

      if (!res.ok) throw new Error(`Decision submission failed: HTTP ${res.status}`);

      // Update local step with decision
      setSteps((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) last.humanDecision = decision;
        return copy;
      });

      if (decision === 'ALLOW_ONCE') {
        setSessionStatus('LIVE');
        // Resume next step
        setIsRunning(true);
        setTimeout(async () => {
          try {
            const nextStepRes = await fetch('/api/v1/live-agent/step', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });
            if (nextStepRes.ok) {
              const nextStepData: ControlledStepResult = await nextStepRes.json();
              setSteps((prev) => [...prev, nextStepData]);
              setSelectedStepIndex(steps.length);
              setSessionStatus(nextStepData.decision === 'BLOCK' ? 'BLOCKED' : 'COMPLETED');
            }
          } catch {
            setSessionStatus('COMPLETED');
          } finally {
            setIsRunning(false);
          }
        }, 600);
      } else {
        setSessionStatus('BLOCKED');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const currentStep = steps[selectedStepIndex] || steps[steps.length - 1];

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'ALLOW':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'MONITOR':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'WARN':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'CONFIRM':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'BLOCK':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Connection Indicator */}
      <AgentConnectionStatus />

      {/* Security Control Center Header */}
      <div className="card-tactile p-6 bg-gradient-to-r from-surface-primary to-surface-50 dark:from-surface-primary dark:to-surface-850 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                {sessionStatus === 'LIVE' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  sessionStatus === 'LIVE'
                    ? 'bg-emerald-500'
                    : sessionStatus === 'PAUSED'
                    ? 'bg-amber-500'
                    : sessionStatus === 'BLOCKED'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`} />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Security Operations Center // External Agent Gate
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Session: {sessionStatus}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Live Agent Governance Console
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <div>Agent: <span className="text-slate-900 dark:text-slate-100 font-semibold">Gemini Research Agent {agentId ? `(${agentId})` : ''}</span></div>
              <div>Provider: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{providerStatus?.providerName || 'Google Gemini'}</span></div>
              <div>Model: <span className="text-slate-900 dark:text-slate-100 font-mono font-semibold">{providerStatus?.modelName || 'gemini-1.5-flash'}</span></div>
              <div>Task: <span className="text-slate-900 dark:text-slate-100 italic">Research project information</span></div>
            </div>
          </div>

          {/* Scenario Selector & Run Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              disabled={isRunning || sessionStatus === 'PAUSED'}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface-primary dark:bg-surface-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleStartSession}
              disabled={isRunning}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-tactile-subtle transition-all cursor-pointer ${
                isRunning
                  ? 'bg-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Governing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Agent Session</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Provider Graceful Fallback Banner */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {providerStatus?.isConfigured
                ? 'Gemini Connected — Real model inference active.'
                : 'Gemini is not configured — running deterministic demo agent.'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Enforcement: Sentinel REST Gate (/api/v1/actions)
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Human Intervention Decision Banner (Active when sessionStatus is PAUSED) */}
      {sessionStatus === 'PAUSED' && currentStep && (
        <div className="card-tactile p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-700/60 animate-pulse-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>Intervention Window Triggered // Human Decision Required</span>
              </div>

              {/* Simple Mode Layman Prompt */}
              {isSimple ? (
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {currentStep.simpleNarration.what}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Why?</strong> {currentStep.simpleNarration.why}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    Risk Assessment: {currentStep.simpleNarration.risk}
                  </p>
                </div>
              ) : (
                /* Expert Mode Technical Diagnostics */
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                    CONFIRM: {currentStep.proposedAction.action} {currentStep.proposedAction.resource}
                  </h3>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    Deviation: {currentStep.trajectoryDeviation}% | Risk: {currentStep.risk}/100 | Window: {currentStep.interventionWindow}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scope: <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{currentStep.proposedAction.scope}</code> (Unauthorized)
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleHumanDecision('ALLOW_ONCE')}
                disabled={isSubmittingDecision}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-tactile-subtle flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Allow Once</span>
              </button>

              <button
                onClick={() => handleHumanDecision('DENY')}
                disabled={isSubmittingDecision}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-tactile-subtle flex items-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Deny</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Overview Cards (Expert & Simple Mode) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Agent</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block mt-1">Gemini</span>
        </div>

        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Session</span>
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate block mt-1">
            {sessionId || 'Not Started'}
          </span>
        </div>

        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Action</span>
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate block mt-1">
            {currentStep?.proposedAction.action || '—'}
          </span>
        </div>

        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Risk</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs font-bold ${
              (currentStep?.risk ?? 0) >= 70 ? 'text-rose-500' : (currentStep?.risk ?? 0) >= 40 ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {currentStep?.risk ?? 0}
            </span>
            <span className="text-[10px] text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Deviation</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1">
            {currentStep?.trajectoryDeviation ?? 0}%
          </span>
        </div>

        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Acceleration</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1">
            {currentStep?.riskAcceleration || 'STABLE'}
          </span>
        </div>

        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Predicted Risk</span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mt-1">
            {currentStep?.predictedNextRisk ?? 0}
          </span>
        </div>

        <div className="card-tactile p-3 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Decision</span>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getDecisionBadge(currentStep?.decision || 'ALLOW')}`}>
            {currentStep?.decision || 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Live Stream & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Security Event Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Governance Telemetry Stream
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {steps.length} Events Logged
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {steps.length === 0 ? (
              <div className="card-tactile p-8 text-center text-slate-400 text-xs border-dashed">
                Session idle. Click "Run Agent Session" to initiate governed agent stream.
              </div>
            ) : (
              steps.map((step, idx) => {
                const isSelected = selectedStepIndex === idx;
                const timeStr = new Date(step.timestamp).toLocaleTimeString();
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedStepIndex(idx)}
                    className={`card-tactile p-4 transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Timestamp + Stream Flow Header */}
                    <div className="flex items-center justify-between gap-3 text-xs mb-2">
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timeStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getDecisionBadge(step.decision)}`}>
                          Sentinel → {step.decision}
                        </span>
                        {step.humanDecision && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Operator: {step.humanDecision}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Agent Proposal */}
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-surface-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 mt-0.5">
                        {step.stepNumber}
                      </span>
                      <div className="space-y-1 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="text-indigo-600 dark:text-indigo-400">Gemini</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{step.proposedAction.action} {step.proposedAction.resource}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          "{step.proposedAction.reason}"
                        </p>
                      </div>
                    </div>

                    {/* Simple vs Expert Stream Details */}
                    {isSimple ? (
                      <div className="mt-3 p-2.5 rounded-lg bg-surface-50 dark:bg-surface-850 border border-slate-200/60 dark:border-slate-800 text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {step.simpleNarration.what}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>Risk: {step.risk}/100</span>
                        <span>Deviation: {step.trajectoryDeviation}%</span>
                        <span>Window: {step.interventionWindow}</span>
                        <span>Scope: {step.proposedAction.scope}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={streamEndRef} />
          </div>
        </div>

        {/* Right 1 Col: Detailed Step Inspector */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isSimple ? 'Sentinel Safety Summary' : 'Security Engine Telemetry'}
          </h2>

          {currentStep ? (
            <div className="card-tactile p-5 border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step {currentStep.stepNumber} Inspector
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {currentStep.proposedAction.action} {currentStep.proposedAction.resource}
                </h3>
              </div>

              {isSimple ? (
                /* Simple Mode Explanation Cards */
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 space-y-1.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      What is happening?
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {currentStep.simpleNarration.what}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-850 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Why did Sentinel flag this?
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {currentStep.simpleNarration.why}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-850 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Recommendation:
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {currentStep.simpleNarration.actionRecommendation}
                    </p>
                  </div>
                </div>
              ) : (
                /* Expert Mode Technical Breakdown */
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Policy Verdict Reasons:</span>
                    <ul className="mt-1 space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {currentStep.decisionReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Resource:</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate max-w-[170px]">{currentStep.proposedAction.resource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Required Scope:</span>
                      <span className="text-slate-800 dark:text-slate-200">{currentStep.proposedAction.scope}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sensitivity:</span>
                      <span className="text-slate-800 dark:text-slate-200">{currentStep.proposedAction.sensitivity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reversibility:</span>
                      <span className="text-slate-800 dark:text-slate-200">{currentStep.proposedAction.reversibility}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Risk Velocity:</span>
                      <span className="text-slate-800 dark:text-slate-200">{currentStep.riskAcceleration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Intervention Window:</span>
                      <span className="text-amber-500 font-bold">{currentStep.interventionWindow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Forecast Horizon Risk:</span>
                      <span className="text-indigo-500 font-bold">{currentStep.predictedNextRisk}/100</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Execution Status:</span>
                <span className={currentStep.executed ? 'text-emerald-500' : 'text-rose-500'}>
                  {currentStep.executed ? 'EXECUTED (GOVERNED)' : 'TERMINATED (BLOCKED)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No step data selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
