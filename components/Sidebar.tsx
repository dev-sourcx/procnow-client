'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getProductSheet, deleteChatSession } from '@/lib/api';
import { getAuthToken } from '@/lib/storage';
import type { CurrentUser } from '@/lib/api';
import { ChatSession } from '@/lib/storage';

interface SidebarProps {
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
}

export default function Sidebar({
  onNewChat,
  isOpen,
  onToggle,
  currentUser,
  onLogout,
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionDelete,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [productCount, setProductCount] = useState<number>(0);
  const [isChatDropdownOpen, setIsChatDropdownOpen] = useState<boolean>(false);

  const loadProductCount = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setProductCount(0);
        return;
      }

      const productSheet = await getProductSheet(token);
      setProductCount(productSheet.itemCount ?? productSheet.productSheetItems?.length ?? 0);
    } catch (error) {
      console.error('Error loading product count:', error);
      setProductCount(0);
    }
  };

  useEffect(() => {
    // Load product count on mount
    loadProductCount();

    // Listen for custom event for same-tab updates
    const handleCustomStorageChange = () => {
      loadProductCount();
    };
    
    window.addEventListener('productAdded', handleCustomStorageChange);

    return () => {
      window.removeEventListener('productAdded', handleCustomStorageChange);
    };
  }, []);

  const handleProductSheetClick = () => {
    router.push('/product-sheet');
    onToggle(); // Close sidebar on mobile
  };

  const handleChatClick = () => {
    if (currentUser && sessions.length > 0) {
      setIsChatDropdownOpen(!isChatDropdownOpen);
    } else {
      router.push('/');
      onToggle(); // Close sidebar on mobile
    }
  };

  const handleEnquiriesClick = () => {
    router.push('/enquiries');
    onToggle(); // Close sidebar on mobile
  };

  const handleLoginClick = () => {
    router.push('/login');
    onToggle(); // Close sidebar on mobile
  };

  const handleSessionClick = (sessionId: string) => {
    onSessionSelect(sessionId);
    setIsChatDropdownOpen(false);
    onToggle(); // Close sidebar on mobile
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent session selection when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this chat session?')) {
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    try {
      await deleteChatSession(token, sessionId);
      onSessionDelete(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-lg">
              C
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Client Portal</h2>
          </div>

          <div className="flex-1 flex flex-col gap-1 overflow-y-auto px-3 py-4">
            {/* Navigation Links */}
            <div className="flex flex-col gap-1">
              <div>
                <button
                  onClick={handleChatClick}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    pathname === '/' || pathname === ''
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
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
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Discover Products
                  </div>
                  {currentUser && sessions.length > 0 && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${isChatDropdownOpen ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  )}
                </button>
                {/* Chat Sessions Dropdown */}
                {isChatDropdownOpen && currentUser && sessions.length > 0 && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-gray-200 dark:border-gray-700 flex flex-col gap-1 max-h-64 overflow-y-auto">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleSessionClick(session.id)}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                          currentSessionId === session.id
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
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
                          className="shrink-0"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{session.title}</div>
                          <div className={`text-xs truncate ${
                            currentSessionId === session.id ? 'text-teal-50' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatDate(session.updatedAt)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                          aria-label="Delete session"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={handleProductSheetClick}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    pathname === '/product-sheet'
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    My Products
                  </div>
                  {productCount > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      pathname === '/product-sheet'
                        ? 'bg-teal-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {productCount}
                    </span>
                  )}
                </button>
              </div>
              <div>
                <button
                  onClick={handleEnquiriesClick}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    pathname === '/enquiries' || pathname?.startsWith('/enquiries/')
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
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
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  My Enquiries
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 rounded-b-lg">
            {currentUser ? (
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex w-full items-center gap-3 rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

