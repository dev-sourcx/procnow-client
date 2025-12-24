'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MessageList from './MessageList';
import InputBox from './InputBox';
import ProductSection from './ProductSection';
import {
  sendChatMessage,
  checkApiHealth,
  ChatMessage,
  getProducts,
  Product,
  createChatSession,
  updateChatSession,
  getChatMessages,
  createChatMessageBackend,
  updateChatMessageBackend,
} from '@/lib/api';
import { 
  generateSessionTitle, 
  Message, 
  getGuestSession,
  saveGuestSession,
  deleteGuestSession,
  getGuestMessages,
  saveGuestMessages,
} from '@/lib/storage';
import { getAuthToken } from '@/lib/storage';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAssistantMessageRef = useRef<string>('');
  const currentAssistantProductsRef = useRef<Product[]>([]);
  const sessionIdRef = useRef<string | null>(currentSessionId);
  const currentAssistantMessageIdRef = useRef<string | null>(null);
  const token = getAuthToken();
  const isAuthenticated = !!token;

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
    const loadMessages = async () => {
      if (!currentSessionId) {
        sessionIdRef.current = null;
        
        // If not authenticated, load guest session from localStorage
        if (!isAuthenticated || !token) {
          const guestSession = getGuestSession();
          if (guestSession) {
            sessionIdRef.current = guestSession.id;
            const guestMessages = getGuestMessages();
            setMessages(guestMessages);
          } else {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
        return;
      }

      // Load guest messages if not authenticated
      if (!isAuthenticated || !token) {
        sessionIdRef.current = currentSessionId;
        // Check if this is the guest session
        const guestSession = getGuestSession();
        if (guestSession && guestSession.id === currentSessionId) {
          const guestMessages = getGuestMessages();
          setMessages(guestMessages);
        } else {
          setMessages([]);
        }
        return;
      }

      sessionIdRef.current = currentSessionId;
      // Reset title tracking when session changes
      sessionTitleSetRef.current.delete(currentSessionId);

      try {
        const backendMessages = await getChatMessages(token, currentSessionId);
        // Convert backend messages to frontend format
        const convertedMessages: Message[] = backendMessages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          products: msg.products || [],
        }));
        setMessages(convertedMessages);
        
        // If messages already exist, mark title as set
        if (convertedMessages.length > 0) {
          sessionTitleSetRef.current.add(currentSessionId);
        }
      } catch (error) {
        console.error('Error loading messages from backend:', error);
        setMessages([]);
      }
    };

    loadMessages();
  }, [currentSessionId, isAuthenticated, token]);

  // Track if we've already set the title for this session to avoid infinite updates
  const sessionTitleSetRef = useRef<Set<string>>(new Set());

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Handle guest users - save to localStorage
    if (!isAuthenticated || !token) {
      // Create or get guest session
      let guestSession = getGuestSession();
      let currentId = sessionIdRef.current;
      
      if (!guestSession || !currentId) {
        // Create new guest session
        const title = generateSessionTitle(message);
        const sessionId = `guest_${Date.now()}`;
        guestSession = {
          id: sessionId,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveGuestSession(guestSession);
        currentId = sessionId;
        sessionIdRef.current = currentId;
        onSessionUpdate(); // Notify parent to reload guest session
      } else {
        currentId = guestSession.id;
        sessionIdRef.current = currentId;
      }
    } else {
      // Handle authenticated users - create session in backend if needed
      let currentId = sessionIdRef.current;
      if (!currentId) {
        const title = generateSessionTitle(message);

        try {
          // Create session in backend
          const newSession = await createChatSession(token, title);
          currentId = newSession._id;
          sessionIdRef.current = currentId;
        } catch (error) {
          console.error('Error creating session in backend:', error);
          return;
        }
        onSessionUpdate();
      }
    }

    const currentId = sessionIdRef.current;
    if (!currentId) {
      console.error('No session ID available');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to backend if authenticated, or to localStorage if guest
    if (isAuthenticated && token && currentId) {
      try {
        const savedMessage = await createChatMessageBackend(token, currentId, 'user', message);
        // Update the message ID with the backend ID
        userMessage.id = savedMessage._id;
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex].role === 'user') {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              id: savedMessage._id,
            };
          }
          return newMessages;
        });
      } catch (error) {
        console.error('Error saving user message to backend:', error);
        // Continue even if backend save fails - message is still in state
      }
    } else {
      // Save to localStorage for guest users
      const currentMessages = getGuestMessages();
      currentMessages.push(userMessage);
      saveGuestMessages(currentMessages);
    }

    // Prepare history for API
    const history: ChatMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create assistant message placeholder (local only, not in backend yet)
    // We'll create it in backend only when [DONE] signal is received
    const assistantMessage: Message = {
      id: `temp_${Date.now()}`, // Temporary local ID
      role: 'assistant',
      content: '',
      products: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);
    currentAssistantMessageRef.current = ''; // Reset ref
    currentAssistantProductsRef.current = []; // Reset products ref
    currentAssistantMessageIdRef.current = null; // Reset backend ID ref

    try {
      await sendChatMessage(
        history,
        message,
        async (chunk) => {
          // Accumulate chunks in ref to prevent duplication
          currentAssistantMessageRef.current += chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              // Use the ref value to ensure we don't duplicate, preserve products
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: currentAssistantMessageRef.current,
                products: newMessages[lastIndex].products || currentAssistantProductsRef.current,
              };
            }
            return newMessages;
          });
          // Don't update backend during streaming - wait for [DONE] signal
        },
        async (products) => {
          // Handle products received from stream
          console.log('Products received from stream:', products);
          currentAssistantProductsRef.current = products;
          // Update the current assistant message with products
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                products: products,
              };
            }
            return newMessages;
          });
          // Don't update backend during streaming - wait for [DONE] signal
        },
        async () => {
          // Called when [DONE] signal is received - save final message
          const finalContent = currentAssistantMessageRef.current || '';
          const finalProducts = currentAssistantProductsRef.current || [];
          
          if (isAuthenticated && token && sessionIdRef.current) {
            // Save to backend for authenticated users
            console.log('Streaming complete. Creating final message in backend:', {
              sessionId: sessionIdRef.current,
              contentLength: finalContent.length,
              productsCount: finalProducts.length,
              contentPreview: finalContent.substring(0, 50)
            });
            
            try {
              // Create assistant message in backend with complete content (only when [DONE] is received)
              const savedMessage = await createChatMessageBackend(
                token,
                sessionIdRef.current,
                'assistant',
                finalContent,
                finalProducts
              );
              
              console.log('Final message created successfully in backend:', savedMessage._id);
              
              // Update the local message with the backend ID
              setMessages((currentMessages) => {
                const newMessages = [...currentMessages];
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                  // Update with backend ID and final content
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    id: savedMessage._id,
                    content: finalContent,
                    products: finalProducts,
                  };
                }
                
                // Update session title only once after streaming completes
                if (!sessionTitleSetRef.current.has(sessionIdRef.current!)) {
                  const firstUserMessage = newMessages.find((m) => m.role === 'user');
                  if (firstUserMessage) {
                    const title = generateSessionTitle(firstUserMessage.content);
                    sessionTitleSetRef.current.add(sessionIdRef.current!);
                    
                    updateChatSession(token, sessionIdRef.current!, title)
                      .then(() => {
                        // Defer parent state update to avoid setState during render
                        setTimeout(() => {
                          onSessionUpdate();
                        }, 0);
                      })
                      .catch((error) => {
                        console.error('Error updating session title in backend:', error);
                        sessionTitleSetRef.current.delete(sessionIdRef.current!);
                      });
                  }
                }
                
                return newMessages;
              });
              
              // Store the backend message ID for future reference
              currentAssistantMessageIdRef.current = savedMessage._id;
              
              // Refresh sessions list
              onSessionUpdate();
            } catch (error) {
              console.error('Error creating final message in backend:', error);
            }
          } else {
            // Save to localStorage for guest users
            setMessages((currentMessages) => {
              const newMessages = [...currentMessages];
              const lastIndex = newMessages.length - 1;
              if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                newMessages[lastIndex] = {
                  ...newMessages[lastIndex],
                  content: finalContent,
                  products: finalProducts,
                };
              }
              
              // Save all messages to localStorage
              saveGuestMessages(newMessages);
              
              // Update guest session title if needed
              const guestSession = getGuestSession();
              if (guestSession && sessionIdRef.current === guestSession.id) {
                const firstUserMessage = newMessages.find((m) => m.role === 'user');
                if (firstUserMessage) {
                  const title = generateSessionTitle(firstUserMessage.content);
                  const updatedSession = {
                    ...guestSession,
                    title,
                    updatedAt: Date.now(),
                  };
                  saveGuestSession(updatedSession);
                  // Defer parent state update to avoid setState during render
                  setTimeout(() => {
                    onSessionUpdate();
                  }, 0);
                }
              }
              
              return newMessages;
            });
          }
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
          const errorContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if the backend is running.`;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: errorContent,
          };
          
          // Save error message to backend
          if (isAuthenticated && token && currentAssistantMessageIdRef.current) {
            updateChatMessageBackend(
              token,
              currentAssistantMessageIdRef.current,
              errorContent,
              currentAssistantProductsRef.current
            ).catch((err) => {
              console.error('Error saving error message to backend:', err);
            });
          }
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      // Final save is now handled by the onDone callback when [DONE] signal is received
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
            Add Product
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
          </>
        )}
      </div>

      {/* Input */}
      <InputBox onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}