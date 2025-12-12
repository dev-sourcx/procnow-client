'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MessageList from './MessageList';
import InputBox from './InputBox';
import ProductSection from './ProductSection';
import { sendChatMessage, checkApiHealth, ChatMessage, getProducts, Product } from '@/lib/api';
import {
  getStoredSessions,
  saveSession,
  getStoredMessages,
  saveMessages,
  generateSessionTitle,
  ChatSession,
  Message,
} from '@/lib/storage';

export type { Message };

interface ChatContainerProps {
  currentSessionId: string | null;
  onSessionUpdate: () => void;
}

export default function ChatContainer({
  currentSessionId,
  onSessionUpdate,
}: ChatContainerProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAssistantMessageRef = useRef<string>('');
  const sessionIdRef = useRef<string | null>(currentSessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check API connection on mount
  useEffect(() => {
    checkApiHealth().then(setIsApiConnected);
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      sessionIdRef.current = currentSessionId;
      const storedMessages = getStoredMessages(currentSessionId);
      setMessages(storedMessages);
    } else {
      sessionIdRef.current = null;
      setMessages([]);
    }
  }, [currentSessionId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (sessionIdRef.current && messages.length > 0) {
      saveMessages(sessionIdRef.current, messages);
      
      // Update session title from first user message
      const firstUserMessage = messages.find((m) => m.role === 'user');
      if (firstUserMessage) {
        const sessions = getStoredSessions();
        const session = sessions.find((s) => s.id === sessionIdRef.current);
        if (session) {
          const title = generateSessionTitle(firstUserMessage.content);
          if (session.title !== title) {
            saveSession({
              ...session,
              title,
              updatedAt: Date.now(),
            });
            onSessionUpdate();
          }
        }
      }
    }
  }, [messages, onSessionUpdate]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Create new session if needed
    let currentId = sessionIdRef.current;
    if (!currentId) {
      currentId = `session_${Date.now()}`;
      sessionIdRef.current = currentId;
      const newSession: ChatSession = {
        id: currentId,
        title: generateSessionTitle(message),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveSession(newSession);
      onSessionUpdate();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare history for API
    const history: ChatMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, assistantMessage]);
    currentAssistantMessageRef.current = ''; // Reset ref

    try {
      await sendChatMessage(
        history,
        message,
        (chunk) => {
          // Accumulate chunks in ref to prevent duplication
          currentAssistantMessageRef.current += chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              // Use the ref value to ensure we don't duplicate
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: currentAssistantMessageRef.current,
              };
            }
            return newMessages;
          });
        },
        (products) => {
          // Handle products received from stream
          console.log('Products received from stream:', products);
          setProducts(products);
        },
        (error) => {
          console.error('Error sending message:', error);
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: `Error: ${error.message}. Please check if the backend is running at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`,
              };
            }
            return newMessages;
          });
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if the backend is running.`,
          };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      // Update session timestamp
      if (sessionIdRef.current) {
        const sessions = getStoredSessions();
        const session = sessions.find((s) => s.id === sessionIdRef.current);
        if (session) {
          saveSession({
            ...session,
            updatedAt: Date.now(),
          });
          onSessionUpdate();
        }
      }
    }
  };


  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex h-12 items-center justify-center border-b border-gray-700 bg-[#343541] px-4">
        <h1 className="text-lg font-semibold text-white">Chat Assistant</h1>
        <div className="ml-auto flex items-center gap-3">
          {/* Brief Button */}
          <button
            onClick={() => router.push('/brief')}
            className="px-3 py-1.5 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Brief
          </button>
          {/* API Connection Status */}
          {isApiConnected !== null && (
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isApiConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={
                  isApiConnected
                    ? 'Backend connected'
                    : 'Backend not connected'
                }
              />
              <span className="text-xs text-gray-400">
                {isApiConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-semibold text-gray-300">
                How can I help you today?
              </h2>
              <p className="text-gray-500">
                Start a conversation by typing a message below.
              </p>
            </div>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
            {/* Product Section - Show after messages when assistant has finished responding */}
            {!isLoading && 
             messages.length > 0 && 
             products.length > 0 && 
             messages[messages.length - 1]?.role === 'assistant' && (
              <ProductSection products={products} />
            )}
          </>
        )}
      </div>

      {/* Input */}
      <InputBox onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}