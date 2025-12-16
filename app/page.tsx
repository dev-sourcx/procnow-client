'use client';

import { useState, useEffect } from 'react';
import ChatContainer from '@/components/ChatContainer';
import Sidebar from '@/components/Sidebar';
import {
  getStoredSessions,
  deleteSession,
  ChatSession,
} from '@/lib/storage';

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const storedSessions = getStoredSessions();
    setSessions(storedSessions);
    
    // Auto-select first session if available and none selected
    // if (!currentSessionId && storedSessions.length > 0) {
    //   setCurrentSessionId(storedSessions[0].id);
    // }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
  };

  return (
    <main className="flex h-screen w-full bg-[#343541]">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
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
          onSessionUpdate={loadSessions}
        />
      </div>
    </main>
  );
}
