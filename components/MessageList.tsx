'use client';

import Message from './Message';
import ProductSection from './ProductSection';
import { Message as MessageType } from '@/lib/storage';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
}

export default function MessageList({ messages, isLoading = false }: MessageListProps) {
  return (
    <div className="flex flex-col py-4">
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1;
        const isAssistantMessage = message.role === 'assistant';
        const hasProducts = message.products && message.products.length > 0;
        const showLoading = isLoading && isLastMessage && isAssistantMessage && !hasProducts;
        
        return (
          <div key={message.id}>
            <Message message={message} />
            {/* Show loading when products are expected but not yet available */}
            {showLoading && (
              <div className="w-full px-4 py-6">
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-teal-200 dark:border-teal-800 border-t-teal-600 dark:border-t-teal-400 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading products...</p>
                  </div>
                </div>
              </div>
            )}
            {/* Render products right after assistant messages that have products */}
            {isAssistantMessage && hasProducts && (
              <ProductSection products={message.products} />
            )}
          </div>
        );
      })}
    </div>
  );
}

