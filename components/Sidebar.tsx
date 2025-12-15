'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredProducts } from '@/lib/storage';

interface SidebarProps {
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ onNewChat, isOpen, onToggle }: SidebarProps) {
  const router = useRouter();
  const [productCount, setProductCount] = useState<number>(0);

  const loadProductCount = () => {
    const products = getStoredProducts();
    setProductCount(products.length);
  };

  useEffect(() => {
    // Load product count on mount
    loadProductCount();

    // Listen for storage changes (when products are added from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'brief_products') {
        loadProductCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleCustomStorageChange = () => {
      loadProductCount();
    };
    
    window.addEventListener('productAdded', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('productAdded', handleCustomStorageChange);
    };
  }, []);

  const handleProductSheetClick = () => {
    router.push('/product-sheet');
    onToggle(); // Close sidebar on mobile
  };

  const handleChatClick = () => {
    router.push('/');
    onToggle(); // Close sidebar on mobile
  };

  const handleEnquiriesClick = () => {
    router.push('/enquiries');
    onToggle(); // Close sidebar on mobile
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#202123] text-white transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* New Chat Button */}
          <div className="p-2">
            <button
              onClick={onNewChat}
              className="flex w-full items-center gap-3 rounded-lg border border-white/20 px-3 py-2.5 text-sm hover:bg-gray-800 transition-colors"
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
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New chat
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-6 overflow-y-auto px-2 py-4">
            <div>
              <button
                onClick={handleChatClick}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
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
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Chat
              </button>
            </div>
            <div>
              <button
                onClick={handleProductSheetClick}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
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
                  Product Sheet
                </div>
                {productCount !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                    {productCount}
                  </span>
                )}
              </button>
            </div>
            <div>
              <button
                onClick={handleEnquiriesClick}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
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
                Enquiries
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 p-2">
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Chat Assistant</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

