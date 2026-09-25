import React from 'react';
import { useMode } from '../hooks/useMode';
import { useNavigation } from '../stores/navigationContext';
import { SimpleOverview } from '../features/simple/SimpleOverview';
import { ExpertOverview } from '../features/expert/ExpertOverview';
import { AgentsView } from '../features/agents/AgentsView';
import { SessionsView } from '../features/sessions/SessionsView';
import { LiveActionsView } from '../features/actions/LiveActionsView';
import { AuditTrailView } from '../features/audit/AuditTrailView';
import { TrajectoryView } from '../features/trajectory/TrajectoryView';
import { InterventionsView } from '../features/interventions/InterventionsView';

export const DashboardPage: React.FC = () => {
  const { isSimple } = useMode();
  const { activeTab } = useNavigation();

  return (
    <div className="w-full">
      {activeTab === 'agents' && <AgentsView />}
      {activeTab === 'sessions' && <SessionsView />}
      {activeTab === 'actions' && <LiveActionsView />}
      {activeTab === 'audit' && <AuditTrailView />}
      {activeTab === 'trajectory' && <TrajectoryView />}
      {activeTab === 'interventions' && <InterventionsView />}
      {(activeTab === 'dashboard' || !['agents', 'sessions', 'actions', 'audit', 'trajectory', 'interventions'].includes(activeTab)) && (
        isSimple ? <SimpleOverview /> : <ExpertOverview />
      )}
    </div>
  );
};
