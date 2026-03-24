import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  onChange,
  className = '',
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);
  const activeTab = controlledActiveTab ?? internalActiveTab;
  
  const handleTabChange = (tabId: string) => {
    setInternalActiveTab(tabId);
    onChange?.(tabId);
  };
  
  return (
    <div className={`flex gap-1 p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-[#00D4FF] text-[#0B0B0F]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => handleTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export interface TabProps {
  children: React.ReactNode;
  className?: string;
}

export const Tab: React.FC<TabProps> = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};
