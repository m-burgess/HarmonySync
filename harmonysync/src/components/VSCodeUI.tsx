import React, { forwardRef } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// Type definitions
interface ActivityBarIconProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number | string | null;
}

interface VSCodeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'icon';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  icon?: React.ReactNode | null;
}

interface ListItem {
  label?: string;
  text?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  [key: string]: unknown;
}

interface VSCodeListProps {
  items?: ListItem[];
  onItemClick?: (item: ListItem, index: number) => void;
  className?: string;
}

interface VSCodeTreeItemProps {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  expanded?: boolean;
  hasChildren?: boolean;
  onClick?: () => void;
  onToggle?: () => void;
  children?: React.ReactNode;
  className?: string;
}

interface Tab {
  label: string;
  icon?: React.ReactNode;
}

interface VSCodeTabsProps {
  tabs?: Tab[];
  activeTab?: number;
  onTabClick?: (index: number) => void;
  className?: string;
}

interface StatusBarItem {
  text: string;
  icon?: React.ReactNode;
}

interface StatusBarItems {
  left?: StatusBarItem[];
  right?: StatusBarItem[];
}

interface VSCodeStatusBarProps {
  items?: StatusBarItems;
  className?: string;
}

interface VSCodePanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

interface VSCodeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

interface VSCodeSidebarProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

// VS Code Activity Bar Icon Component
export const ActivityBarIcon: React.FC<ActivityBarIconProps> = ({ 
  icon, 
  label, 
  active = false, 
  onClick, 
  badge = null 
}) => (
  <div 
    className={`vscode-activity-icon ${active ? 'active' : ''}`}
    onClick={onClick}
    title={label}
  >
    <div className="icon text-lg mb-1">{icon}</div>
    {label && <div className="label">{label}</div>}
    {badge && (
      <div className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
        {badge}
      </div>
    )}
  </div>
);

// VS Code Button Component
export const VSCodeButton: React.FC<VSCodeButtonProps> = ({ 
  children, 
  variant = "primary", 
  onClick, 
  disabled = false, 
  className = "",
  title = "",
  icon = null,
  ...props 
}) => {
  const baseClasses = "vscode-button";
  const variantClasses: Record<string, string> = {
    primary: "",
    secondary: "secondary",
    icon: "vscode-button-icon"
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      {...props}
    >
      {icon && <span className="text-sm">{icon}</span>}
      {children}
    </button>
  );
};

// VS Code List Component
export const VSCodeList: React.FC<VSCodeListProps> = ({ 
  items = [], 
  onItemClick, 
  className = "" 
}) => (
  <div className={`vscode-list ${className}`}>
    {items.map((item, index) => (
      <div 
        key={index}
        className={`vscode-list-item ${item.selected ? 'selected' : ''}`}
        onClick={() => onItemClick?.(item, index)}
      >
        {item.icon && <span className="mr-2 text-sm">{item.icon}</span>}
        <span>{item.label || item.text}</span>
      </div>
    ))}
  </div>
);

// VS Code Tree Item Component
export const VSCodeTreeItem: React.FC<VSCodeTreeItemProps> = ({ 
  label, 
  icon, 
  selected = false, 
  expanded = false, 
  hasChildren = false, 
  onClick, 
  onToggle,
  children,
  className = ""
}) => (
  <div className={className}>
    <div 
      className={`vscode-tree-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {hasChildren && (
        <button 
          className="vscode-tree-icon mr-1 w-4 h-4 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        >
          {expanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
        </button>
      )}
      {!hasChildren && <div className="w-4 mr-1" />}
      {icon && <span className="vscode-tree-icon mr-2">{icon}</span>}
      <span>{label}</span>
    </div>
    {expanded && hasChildren && (
      <div className="ml-4">{children}</div>
    )}
  </div>
);

// VS Code Tabs Component
export const VSCodeTabs: React.FC<VSCodeTabsProps> = ({ 
  tabs = [], 
  activeTab, 
  onTabClick, 
  className = "" 
}) => (
  <div className={`vscode-tabs ${className}`}>
    {tabs.map((tab, index) => (
      <div 
        key={index}
        className={`vscode-tab ${activeTab === index ? 'active' : ''}`}
        onClick={() => onTabClick?.(index)}
      >
        {tab.icon && <span className="mr-2">{tab.icon}</span>}
        <span>{tab.label}</span>
      </div>
    ))}
  </div>
);

// VS Code Status Bar Component
export const VSCodeStatusBar: React.FC<VSCodeStatusBarProps> = ({ 
  items = {}, 
  className = "" 
}) => (
  <div className={`
    bg-blue-600 text-white text-xs px-3 py-1 
    flex items-center justify-between border-t border-gray-700
    ${className}
  `}>
    <div className="flex items-center gap-4">
      {items.left?.map((item, i) => (
        <div key={i} className="flex items-center gap-1 cursor-pointer hover:bg-blue-500/50 px-1 py-0.5 rounded">
          {item.icon && <span>{item.icon}</span>}
          <span>{item.text}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-4">
      {items.right?.map((item, i) => (
        <div key={i} className="flex items-center gap-1 cursor-pointer hover:bg-blue-500/50 px-1 py-0.5 rounded">
          {item.icon && <span>{item.icon}</span>}
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  </div>
);

// VS Code Panel Component
export const VSCodePanel: React.FC<VSCodePanelProps> = ({ 
  title, 
  children, 
  className = "" 
}) => (
  <div className={`vscode-panel-content ${className}`}>
    {title && <div className="vscode-panel-header">{title}</div>}
    {children}
  </div>
);

// VS Code Input Component
export const VSCodeInput = forwardRef<HTMLInputElement, VSCodeInputProps>(
  ({ className = "", ...props }, ref) => (
    <input 
      ref={ref}
      className={`vscode-input ${className}`}
      {...props}
    />
  )
);

VSCodeInput.displayName = 'VSCodeInput';

// VS Code Sidebar Component
export const VSCodeSidebar: React.FC<VSCodeSidebarProps> = ({ 
  title, 
  children, 
  className = "" 
}) => (
  <div className={`vscode-sidebar ${className}`}>
    <div className="vscode-panel-content border-b border-gray-700">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{title}</div>
    </div>
    <div className="flex-1 overflow-auto vscode-scrollbar">
      {children}
    </div>
  </div>
);
