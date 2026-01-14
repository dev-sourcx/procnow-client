'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  onProductsUpdate?: (data: { products: Product[]; filters?: Record<string, string[]> }) => void;
  prefillText?: string;
  setIsFilterOpen?: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  setDiscoverFilterMeta?: (filters: Record<string, string[]>) => void;
  discoverFilterMeta?: Record<string, string[]> | null;
  discoverSelectedFilters?: Record<string, string[]>;
  setDiscoverSelectedFilters?: (filters: Record<string, string[]>) => void;
}

export default function ChatContainer({
  currentSessionId,
  onSessionUpdate,
  prefillText,
  onProductsUpdate,
  setIsFilterOpen,
  setDiscoverFilterMeta,
  discoverFilterMeta,
  discoverSelectedFilters = {},
  setDiscoverSelectedFilters
}: ChatContainerProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAssistantMessageRef = useRef<string>('');
  const currentAssistantProductsRef = useRef<Product[] | any>([]);
  const sessionIdRef = useRef<string | null>(currentSessionId);
  const currentAssistantMessageIdRef = useRef<string | null>(null);
  const isStreamingRef = useRef<boolean>(false); // Track if we're currently streaming
  const token = getAuthToken();
  const isAuthenticated = !!token;

  // Filter values scroll state
  const filterScrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Collect all filter values for horizontal display
  const getAllFilterValues = () => {
    if (!discoverFilterMeta) return [];
    
    const allFilters: Array<{ key: string; value: string }> = [];
    
    Object.entries(discoverFilterMeta).forEach(([filterKey, values]) => {
      if (Array.isArray(values)) {
        values.forEach((value) => {
          allFilters.push({ key: filterKey, value });
        });
      }
    });
    
    return allFilters;
  };

  // Check scroll position to show/hide arrows
  const checkScrollPosition = useCallback(() => {
    if (!filterScrollContainerRef.current) return;
    
    const container = filterScrollContainerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    // Use a small threshold to account for rounding
    const canScrollLeft = scrollLeft > 5;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
    
    setShowLeftArrow(canScrollLeft);
    setShowRightArrow(canScrollRight);
  }, []);

  useEffect(() => {
    const container = filterScrollContainerRef.current;
    if (container) {
      // Initial check with a small delay to ensure dimensions are calculated
      const timeoutId = setTimeout(() => {
        checkScrollPosition();
      }, 100);
      
      // Also check immediately
      checkScrollPosition();
      
      container.addEventListener('scroll', checkScrollPosition, { passive: true });
      window.addEventListener('resize', checkScrollPosition);
      
      return () => {
        clearTimeout(timeoutId);
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
      };
    }
  }, [discoverFilterMeta, checkScrollPosition]);

  const scrollLeft = () => {
    if (filterScrollContainerRef.current) {
      filterScrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
      // Check position after scroll animation
      setTimeout(() => checkScrollPosition(), 300);
    }
  };

  const scrollRight = () => {
    if (filterScrollContainerRef.current) {
      filterScrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
      // Check position after scroll animation
      setTimeout(() => checkScrollPosition(), 300);
    }
  };

  const toggleFilter = (filterKey: string, value: string) => {
    if (!setDiscoverSelectedFilters) return;
    
    const currentValues = discoverSelectedFilters[filterKey] || [];
    const exists = currentValues.includes(value);
    const nextValues = exists 
      ? currentValues.filter((f) => f !== value) 
      : [...currentValues, value];
    
    const updated = {
      ...discoverSelectedFilters,
      [filterKey]: nextValues,
    };
    
    setDiscoverSelectedFilters(updated);
  };

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
      // Don't reload messages if we're currently streaming a response
      if (isStreamingRef.current) {
        console.log('Skipping message reload - currently streaming');
        return;
      }

      // If no session selected, handle guest vs authenticated default
      if (!currentSessionId) {
        sessionIdRef.current = null;
        
        // If not authenticated, load guest session from localStorage
        if (!isAuthenticated || !token) {
          const guestSession = getGuestSession();
          if (guestSession) {
            sessionIdRef.current = guestSession.id;
            const guestMessages = getGuestMessages();
            // Normalize products to ensure they're always arrays
            const normalizedMessages = guestMessages.map((msg) => ({
              ...msg,
              products: Array.isArray(msg.products) ? msg.products : (msg.products ? [msg.products] : []),
            }));
            setMessages(normalizedMessages);
          } else {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
        return;
      }

      // If this is a guest session (ID starting with 'guest_'), always load from localStorage
      if (currentSessionId.startsWith('guest_')) {
        sessionIdRef.current = currentSessionId;
        const guestMessages = getGuestMessages();
        // Normalize products to ensure they're always arrays
        const normalizedMessages = guestMessages.map((msg) => ({
          ...msg,
          products: Array.isArray(msg.products) ? msg.products : (msg.products ? [msg.products] : []),
        }));
        // Log products for debugging
        normalizedMessages.forEach((msg) => {
          if (msg.products && msg.products.length > 0) {
            console.log(`Loaded guest message ${msg.id} with ${msg.products.length} products:`, msg.products);
          }
        });
        setMessages(normalizedMessages);
        return;
      }

      // Load guest messages if not authenticated
      if (!isAuthenticated || !token) {
        sessionIdRef.current = currentSessionId;
        // Check if this is the guest session
        const guestSession = getGuestSession();
        if (guestSession && guestSession.id === currentSessionId) {
          const guestMessages = getGuestMessages();
          // Normalize products to ensure they're always arrays
          const normalizedMessages = guestMessages.map((msg) => ({
            ...msg,
            products: Array.isArray(msg.products) ? msg.products : (msg.products ? [msg.products] : []),
          }));
          // Log products for debugging
          normalizedMessages.forEach((msg) => {
            if (msg.products && msg.products.length > 0) {
              console.log(`Loaded guest message ${msg.id} with ${msg.products.length} products:`, msg.products);
            }
          });
          setMessages(normalizedMessages);
        } else {
          setMessages([]);
        }
        return;
      }

      // Only reload if sessionId actually changed (avoid unnecessary reloads)
      // If session hasn't changed and we're not streaming, skip reload to preserve existing messages
      if (sessionIdRef.current === currentSessionId) {
        console.log('Skipping message reload - session unchanged');
        return;
      }

      sessionIdRef.current = currentSessionId;
      // Reset title tracking when session changes
      sessionTitleSetRef.current.delete(currentSessionId);

      try {
        const backendMessages = await getChatMessages(token, currentSessionId);
        // Convert backend messages to frontend format
        const convertedMessages: Message[] = backendMessages.map((msg) => {
          // Ensure products is always an array
          const products = Array.isArray(msg.products) ? msg.products : (msg.products ? [msg.products] : []);
          const message: Message = {
            id: msg._id,
            role: msg.role,
            content: msg.content,
            products: products,
          };
          // Log products for debugging
          if (message.products && message.products.length > 0) {
            console.log(`Loaded message ${message.id} with ${message.products.length} products:`, message.products);
          }
          return message;
        });
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
    isStreamingRef.current = true; // Mark that we're starting to stream

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
        async (data) => {
          // Handle products received from stream
          // data structure: { products: Product[], filters?: Record<string, string[]> }
          console.log('Products received from stream:', data);
          const products = data.products || [];
          const filters = data.filters || {};
          
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

          console.log('Filters received:', filters);

          // Set filters metadata
          if (setDiscoverFilterMeta) {
            setDiscoverFilterMeta(filters);
          }

          // Expose products and filters to parent
          if (onProductsUpdate) {
            onProductsUpdate({ products, filters });
            if (setIsFilterOpen) {
              setIsFilterOpen(true);
            }
          }
          // Don't update backend during streaming - wait for [DONE] signal
        },
        async () => {
          // Called when [DONE] signal is received - save final message
          isStreamingRef.current = false; // Mark streaming as complete
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
          isStreamingRef.current = false; // Mark streaming as complete (even on error)
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
      isStreamingRef.current = false; // Mark streaming as complete (even on error)
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
      isStreamingRef.current = false; // Ensure streaming flag is reset
      // Final save is now handled by the onDone callback when [DONE] signal is received
    }
  };


  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-800 px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex items-start pt-4">
            <div className="flex gap-3 max-w-[85%]">
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400">
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
              {/* Greeting Message */}
              <div className="flex flex-col">
                <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <div className="whitespace-pre-wrap break-words text-sm">
                    Hello! I&apos;m your product discovery assistant. I can help you find the right products for your needs. What are you looking for today?
            </div>
        </div>
      </div>
            </div>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Horizontal Filter Values Section */}
      {discoverFilterMeta && Object.keys(discoverFilterMeta).length > 0 && (
        <div className="relative border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              type="button"
              onClick={scrollLeft}
              className="absolute left-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent hover:from-gray-100 dark:hover:from-gray-700 flex items-center justify-center"
              aria-label="Scroll left"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Scrollable Filter Values */}
          <div
            ref={filterScrollContainerRef}
            className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
          >
            {getAllFilterValues().map((filter, index) => {
              const filterKey = filter.key;
              // Normalize key to match how vertical sections handle it
              let finalKey = filterKey;
              if (filterKey === 'categories' || filterKey === 'category') {
                finalKey = discoverFilterMeta.categories ? 'categories' : 'category';
              } else if (filterKey === 'price' || filterKey === 'prices') {
                finalKey = discoverFilterMeta.price ? 'price' : 'prices';
              }
              
              const isSelected = (discoverSelectedFilters[finalKey] || []).includes(filter.value);
              
              return (
                <button
                  key={`${filterKey}-${filter.value}-${index}`}
                  type="button"
                  onClick={() => toggleFilter(finalKey, filter.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {filter.value}
                </button>
              );
            })}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              type="button"
              onClick={scrollRight}
              className="absolute right-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-l from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent hover:from-gray-100 dark:hover:from-gray-700 flex items-center justify-center"
              aria-label="Scroll right"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <InputBox onSendMessage={handleSendMessage} isLoading={isLoading} prefill={prefillText} />
    </div>
  );
}