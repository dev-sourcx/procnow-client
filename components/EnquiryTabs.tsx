'use client';

interface EnquiryTabsProps {
  activeTab: 'draft' | 'sentToAdmin' | 'vendorAssigned';
  onTabChange: (tab: 'draft' | 'sentToAdmin' | 'vendorAssigned') => void;
  draftCount: number;
  sentToAdminCount: number;
  vendorAssignedCount: number;
}

export default function EnquiryTabs({
  activeTab,
  onTabChange,
  draftCount,
  sentToAdminCount,
  vendorAssignedCount,
}: EnquiryTabsProps) {
  return (
    <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        <div className="flex">
          {/* Draft Tab */}
          <button
            onClick={() => onTabChange('draft')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 transition-colors relative ${
              activeTab === 'draft'
                ? 'bg-teal-600 dark:bg-teal-600 text-white'
                : 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={activeTab === 'draft' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
              <line x1="16" y1="9" x2="14" y2="9"></line>
            </svg>
            <span
              className={`text-sm ${
                activeTab === 'draft' ? 'text-white font-bold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Draft
            </span>
            {activeTab === 'draft' ? (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-700 dark:bg-teal-700 text-white">
                {draftCount}
              </span>
            ) : (
              <span className="text-gray-700 dark:text-gray-300 text-sm">{draftCount}</span>
            )}
          </button>

          {/* Quote Requested Tab */}
          <button
            onClick={() => onTabChange('sentToAdmin')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 transition-colors ${
              activeTab === 'sentToAdmin'
                ? 'bg-teal-600 dark:bg-teal-600 text-white'
                : 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={activeTab === 'sentToAdmin' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}
            >
              <line x1="22" y1="2" x2="12" y2="12"></line>
              <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
            </svg>
            <span
              className={`text-sm ${
                activeTab === 'sentToAdmin' ? 'text-white font-bold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Quote Requested
            </span>
            {activeTab === 'sentToAdmin' ? (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-700 dark:bg-teal-700 text-white">
                {sentToAdminCount}
              </span>
            ) : (
              <span className="text-gray-700 dark:text-gray-300 text-sm">{sentToAdminCount}</span>
            )}
          </button>

          {/* Quote Received Tab */}
          <button
            onClick={() => onTabChange('vendorAssigned')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 transition-colors ${
              activeTab === 'vendorAssigned'
                ? 'bg-teal-600 dark:bg-teal-600 text-white'
                : 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={activeTab === 'vendorAssigned' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span
              className={`text-sm ${
                activeTab === 'vendorAssigned' ? 'text-white font-bold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Quote Received
            </span>
            {activeTab === 'vendorAssigned' ? (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-700 dark:bg-teal-700 text-white">
                {vendorAssignedCount}
              </span>
            ) : (
              <span className="text-gray-700 dark:text-gray-300 text-sm">{vendorAssignedCount}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

