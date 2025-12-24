'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/ChatContainer';
import Sidebar from '@/components/Sidebar';
import { getCurrentUser, type CurrentUser, getChatSessions, ChatSession as BackendChatSession } from '@/lib/api';
import { 
  getAuthToken, 
  clearAuthToken, 
  ChatSession,
  getGuestSession,
  saveGuestSession,
  deleteGuestSession,
} from '@/lib/storage';

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleSessionDelete = async (sessionId: string) => {
    // Remove from local state
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    
    // If deleted session was current, clear it
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    router.push('/');
  };

  if (isCheckingAuth) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-[#343541]">
        <p className="text-gray-300">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full bg-[#343541]">
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar Toggle Button (Mobile) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#202123] text-white rounded-lg hover:bg-gray-800"
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

        <ChatContainer
          currentSessionId={currentSessionId}
          onSessionUpdate={() => {
            // Defer state updates to avoid setState during render
            setTimeout(async () => {
              const token = getAuthToken();
              if (token) {
                try {
                  // Reload sessions from backend
                  const backendSessions = await getChatSessions(token);
                  const convertedSessions: ChatSession[] = backendSessions.map((s) => ({
                    id: s._id,
                    title: s.title,
                    createdAt: new Date(s.createdAt).getTime(),
                    updatedAt: new Date(s.updatedAt).getTime(),
                  }));
                  setSessions(convertedSessions);
                } catch (error) {
                  console.error('Error reloading sessions from backend:', error);
                  setSessions([]);
                }
              } else {
                // Reload guest session from localStorage
                const guestSession = getGuestSession();
                if (guestSession) {
                  setSessions([guestSession]);
                  setCurrentSessionId((prevId) => {
                    // Only update if not already set to avoid unnecessary re-renders
                    return prevId || guestSession.id;
                  });
                } else {
                  setSessions([]);
                }
              }
            }, 0);
          }}
        />
      </div>
    </main>
  );
}
