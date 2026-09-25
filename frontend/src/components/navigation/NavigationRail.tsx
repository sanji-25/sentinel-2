import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Activity,
  GitBranch,
  ShieldAlert,
  FileText,
  Sliders
} from 'lucide-react';

import { useNavigation, NavigationTab } from '../../stores/navigationContext';

interface NavigationRailProps {
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'agents', label: 'Active Agents', icon: Bot },
  { id: 'sessions', label: 'Sessions', icon: Activity },
  { id: 'actions', label: 'Live Actions', icon: ShieldAlert },
  { id: 'trajectory', label: 'Trajectory', icon: GitBranch, tag: 'Phase 2' },
  { id: 'interventions', label: 'Interventions', icon: Sliders, tag: 'Phase 3' },
  { id: 'audit', label: 'Audit Trail', icon: FileText, tag: 'Phase 5' }
];

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeId,
  onSelect,
  className = ''
}) => {
  const { activeTab, setActiveTab } = useNavigation();
  const currentTab = activeId || activeTab;

  const handleSelect = (id: NavigationTab) => {
    setActiveTab(id);
    onSelect?.(id);
  };
  return (
    <nav
      aria-label="Sidebar Navigation"
      className={`w-64 border-r border-slate-200 dark:border-slate-800 bg-surface-primary dark:bg-surface-primary p-4 flex flex-col justify-between ${className}`}
    >
      <div className="space-y-1.5">
        <div className="px-3 pb-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Control Plane
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-tactile-subtle'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400 dark:text-emerald-600' : ''}`} />
                <span>{item.label}</span>
              </div>
              {item.tag && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                    isActive
                      ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700'
                      : 'bg-surface-100 dark:bg-surface-800 text-slate-400'
                  }`}
                >
                  {item.tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-slate-200/60 dark:border-slate-700/40">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Core Principle
        </p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
          "Don't just detect risk. Know when to intervene."
        </p>
      </div>
    </nav>
  );
};
