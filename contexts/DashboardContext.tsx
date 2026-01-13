'use client';

import { createContext, useContext, ReactNode } from 'react';
import { ChatSession } from '@/lib/storage';
import { CurrentUser } from '@/lib/api';

interface DashboardContextType {
  sessions: ChatSession[];
  setSessions: (sessions: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  handleNewChat: () => void;
  handleSessionSelect: (sessionId: string) => void;
  handleSessionDelete: (sessionId: string) => void;
  handleLogout: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}

export { DashboardContext };
