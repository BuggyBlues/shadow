import React from 'react';

export interface ServerPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ServerPill: React.FC<ServerPillProps> = ({
  label,
  active = false,
  onClick,
  className = '',
}) => {
  return (
    <button
      className={`relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold overflow-hidden transition-all duration-200 ${
        active
          ? 'bg-[#00D4FF] text-[#0B0B0F] shadow-[0_0_12px_rgba(0,212,255,0.5)]'
          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
      } ${className}`}
      onClick={onClick}
    >
      <span className="absolute inset-0 opacity-50" style={{
        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: '6px 6px',
      }} />
      <span className="relative z-10">{label}</span>
    </button>
  );
};

export interface ChatMessageProps {
  avatar?: React.ReactNode;
  name: string;
  nameColor?: 'cyan' | 'pink' | 'green' | 'yellow' | 'purple';
  time?: string;
  children: React.ReactNode;
  className?: string;
}

const nameColorStyles = {
  cyan: 'text-[#00D4FF]',
  pink: 'text-[#FF6B9D]',
  green: 'text-[#4ADE80]',
  yellow: 'text-[#FCD34D]',
  purple: 'text-[#A78BFA]',
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  avatar,
  name,
  nameColor = 'cyan',
  time,
  children,
  className = '',
}) => {
  return (
    <div className={`flex gap-2.5 mb-3 ${className}`}>
      {avatar || (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#A78BFA] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-bold ${nameColorStyles[nameColor]}`}>{name}</span>
          {time && <span className="text-xs text-[var(--text-tertiary)]">{time}</span>}
        </div>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

export interface ChatFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const ChatFrame: React.FC<ChatFrameProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
};
