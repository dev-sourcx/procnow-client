'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { getAuthToken, clearAuthToken, ChatSession, getGuestSession, deleteGuestSession } from '@/lib/storage';
import { getCurrentUser, type CurrentUser, getChatSessions } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  navbarContent?: React.ReactNode;
}

export default function DashboardLayout({ 
  children, 
  showNavbar = true,
  navbarContent 
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [hasFilters, setHasFilters] = useState(false);

  // Listen for filter availability events
  useEffect(() => {
    const handleFiltersAvailable = (event: CustomEvent) => {
      const hasFiltersData = event.detail?.hasFilters ?? false;
      setHasFilters(hasFiltersData);
    };

    const handleNewChat = () => {
      setHasFilters(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('filtersAvailable' as any, handleFiltersAvailable as EventListener);
      window.addEventListener('newChatStarted', handleNewChat);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('filtersAvailable' as any, handleFiltersAvailable as EventListener);
        window.removeEventListener('newChatStarted', handleNewChat);
      }
    };
  }, []);

  // Clear guest chat when browser closes (only for non-authenticated users)
  // But don't clear if user came from login
  useEffect(() => {
    const handleBeforeUnload = () => {
      const token = getAuthToken();
      // Check if user came from login (stored in localStorage)
      const cameFromLogin = localStorage.getItem('came_from_login') === 'true';
      
      // Only clear guest session if:
      // 1. User is not authenticated
      // 2. User did not come from login
      if (!token && !cameFromLogin) {
        deleteGuestSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        // Don't redirect - allow user to browse without login
        // Load guest session from localStorage
        const guestSession = getGuestSession();
        if (guestSession) {
          setSessions([guestSession]);
          setCurrentSessionId(guestSession.id);
        } else {
          setSessions([]);
          setCurrentSessionId(null);
        }
        setIsCheckingAuth(false);
        return;
      }

      try {
        const user = await getCurrentUser(token);
        setCurrentUser(user);
        
        // Clear the came_from_login flag since user is now authenticated
        localStorage.removeItem('came_from_login');
        
        // If successful, load sessions from backend
        try {
          const backendSessions = await getChatSessions(token);
          // Convert backend sessions to frontend format
          const convertedSessions: ChatSession[] = backendSessions.map((s) => ({
            id: s._id,
            title: s.title,
            createdAt: new Date(s.createdAt).getTime(),
            updatedAt: new Date(s.updatedAt).getTime(),
          }));
          setSessions(convertedSessions);
          
          // If there is a guest session from before login, prefer showing that first
          const guestSession = getGuestSession();
          if (guestSession) {
            // Use the guest session ID so ChatContainer can load its messages from localStorage
            setCurrentSessionId(guestSession.id);
          } else {
            // Fallback: if we have a synced session id from login, select that
            const syncedSessionId = sessionStorage.getItem('synced_session_id');
            if (syncedSessionId) {
              const syncedSession = convertedSessions.find(s => s.id === syncedSessionId);
              if (syncedSession) {
                setCurrentSessionId(syncedSessionId);
              }
              sessionStorage.removeItem('synced_session_id');
            }
          }
        } catch (error) {
          console.error('Error loading sessions from backend:', error);
          // On error, don't load any sessions
          setSessions([]);
        }
      } catch {
        // Token is invalid, clear it but don't redirect
        clearAuthToken();
        setCurrentUser(null);
        setSessions([]);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleNewChat = () => {
    const token = getAuthToken();
    if (!token) {
      // If not authenticated, clear guest session and start new one
      deleteGuestSession();
      setSessions([]);
      setCurrentSessionId(null);
    } else {
      // If authenticated, just clear current session
      setCurrentSessionId(null);
    }
    
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('selected_session_id');
      } catch {
      }
      // Dispatch event to notify page.tsx
      try {
        window.dispatchEvent(new CustomEvent('newChatStarted'));
      } catch {
      }
    }
    
    router.push('/');
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('selected_session_id', sessionId);
      } catch {
      }
      try {
        window.dispatchEvent(new CustomEvent('chatSessionSelected', { detail: { sessionId } }));
      } catch {
      }
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    // Remove from local state
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    
    // If deleted session was current, clear it
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      if (typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem('selected_session_id');
          if (stored === sessionId) {
            sessionStorage.removeItem('selected_session_id');
          }
        } catch {
        }
        try {
          window.dispatchEvent(new CustomEvent('chatSessionDeleted', { detail: { sessionId } }));
        } catch {
        }
      }
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    router.push('/login');
  };

  // Expose session handlers via context or props
  const sessionHandlers = {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    handleSessionSelect,
    handleSessionDelete,
  };

  if (isCheckingAuth) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
      </main>
    );
  }

  if (pathname === '/login' || pathname === '/signup') {
    return (
      <main className="flex h-screen w-full bg-white dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col">
          {children}
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        onLogout={handleLogout}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Sidebar Toggle Button (Mobile) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
          aria-label="Toggle sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Top Navbar */}
        {showNavbar && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {pathname === '/' ? (
              // Chat Page Header
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-teal-600 dark:text-teal-400"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI Product Assistant</h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* Filters Toggle Button - Only show when filters are available */}
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        // Dispatch event to toggle filters
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('toggleFilters'));
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4" />
                      </svg>
                      <span>Filters</span>
                    </button>
                  )}
                  <button 
                    onClick={toggleTheme}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Default Navbar for other pages
              <>
                <div className="text-gray-700 dark:text-gray-300 font-medium">
                  {navbarContent || `Welcome, ${currentUser?.name || 'Client'}`}
                </div>
                <button 
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col">
          {children}
        </div>
      </div>
    </main>
  );
}
