import React from 'react';
import { useMode } from '../hooks/useMode';
import { useNavigation } from '../stores/navigationContext';
import { SimpleOverview } from '../features/simple/SimpleOverview';
import { ExpertOverview } from '../features/expert/ExpertOverview';
import { AgentsView } from '../features/agents/AgentsView';
import { SessionsView } from '../features/sessions/SessionsView';
import { LiveActionsView } from '../features/actions/LiveActionsView';

export const DashboardPage: React.FC = () => {
  const { isSimple } = useMode();
  const { activeTab } = useNavigation();

  return (
    <div className="w-full">
      {activeTab === 'agents' && <AgentsView />}
      {activeTab === 'sessions' && <SessionsView />}
      {activeTab === 'actions' && <LiveActionsView />}
      {(activeTab === 'dashboard' || !['agents', 'sessions', 'actions'].includes(activeTab)) && (
        isSimple ? <SimpleOverview /> : <ExpertOverview />
      )}
    </div>
  );
};
