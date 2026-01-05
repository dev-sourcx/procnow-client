'use client';

import Message from './Message';
import ProductSection from './ProductSection';
import { Message as MessageType } from '@/lib/storage';

interface MessageListProps {
  messages: MessageType[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col py-4">
      {messages.map((message) => {
        // Debug: Log products for assistant messages
        if (message.role === 'assistant' && message.products) {
          console.log(`MessageList: Message ${message.id} has ${message.products.length} products:`, message.products);
        }
        
        return (
          <div key={message.id}>
            <Message message={message} />
            {/* Render products right after assistant messages that have products */}
            {message.role === 'assistant' && message.products && message.products.length > 0 && (
              <ProductSection products={message.products} />
            )}
          </div>
        );
      })}
    </div>
  );
}

