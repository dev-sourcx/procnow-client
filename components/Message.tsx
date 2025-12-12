'use client';

import { Message as MessageType } from '@/lib/storage';
import { useEffect, useRef } from 'react';

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll for streaming messages
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [message.content]);

  return (
    <div className={`w-full px-4 py-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          {isUser ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white">
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
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white">
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
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <div
            ref={contentRef}
            className={`rounded-2xl px-4 py-2 ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-[#444654] text-gray-100'
            }`}
          >
            <div className="whitespace-pre-wrap break-words text-sm">
              {message.content || (
                <span className="text-gray-400">Thinking...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

