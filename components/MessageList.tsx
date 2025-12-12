'use client';

import Message from './Message';
import { Message as MessageType } from '@/lib/storage';

interface MessageListProps {
  messages: MessageType[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col py-4">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  );
}

