/**
 * Local storage utilities for auth and chat sessions
 */

import { isAuthenticated } from './auth';

const STORAGE_KEY_AUTH_TOKEN = 'auth_token';

export function saveAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
  } catch (error) {
    console.error('Error saving auth token:', error);
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
  } catch (error) {
    console.error('Error loading auth token:', error);
    return null;
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: any[]; // Product[] from @/lib/api
}

const STORAGE_KEY_SESSIONS = 'chat_sessions';
const STORAGE_KEY_MESSAGES = 'chat_messages';

export function getStoredSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    const sessions = getStoredSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    // Sort by updatedAt descending
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

export function deleteSession(sessionId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const sessions = getStoredSessions().filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    
    // Also delete messages for this session
    const messagesKey = `${STORAGE_KEY_MESSAGES}_${sessionId}`;
    localStorage.removeItem(messagesKey);
  } catch (error) {
    console.error('Error deleting session:', error);
  }
}

export function getStoredMessages(sessionId: string): Message[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const messagesKey = `${STORAGE_KEY_MESSAGES}_${sessionId}`;
    const stored = localStorage.getItem(messagesKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
}

export function saveMessages(
  sessionId: string,
  messages: Message[]
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const messagesKey = `${STORAGE_KEY_MESSAGES}_${sessionId}`;
    localStorage.setItem(messagesKey, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages:', error);
  }
}

export function generateSessionTitle(firstMessage: string): string {
  // Generate title from first message (max 50 chars)
  return firstMessage.slice(0, 50).trim() || 'New Chat';
}

/**
 * Guest session storage utilities
 * Only stores one guest session at a time
 */
const STORAGE_KEY_GUEST_SESSION = 'guest_chat_session';
const STORAGE_KEY_GUEST_MESSAGES = 'guest_chat_messages';

/**
 * Get the guest session from localStorage (only one allowed)
 */
export function getGuestSession(): ChatSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_GUEST_SESSION);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading guest session:', error);
    return null;
  }
}

/**
 * Save the guest session to localStorage (replaces any existing guest session)
 */
export function saveGuestSession(session: ChatSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY_GUEST_SESSION, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving guest session:', error);
  }
}

/**
 * Delete the guest session from localStorage
 */
export function deleteGuestSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY_GUEST_SESSION);
    localStorage.removeItem(STORAGE_KEY_GUEST_MESSAGES);
  } catch (error) {
    console.error('Error deleting guest session:', error);
  }
}

/**
 * Get messages for the guest session
 */
export function getGuestMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_GUEST_MESSAGES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading guest messages:', error);
    return [];
  }
}

/**
 * Save messages for the guest session
 */
export function saveGuestMessages(messages: Message[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY_GUEST_MESSAGES, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving guest messages:', error);
  }
}

/**
 * Get guest session data for syncing (returns null if no guest session exists)
 */
export function getGuestSessionData(): { title: string; messages: Array<{ role: 'user' | 'assistant'; content: string; products?: any[] }> } | null {
  const guestSession = getGuestSession();
  const guestMessages = getGuestMessages();
  
  if (!guestSession || guestMessages.length === 0) {
    return null;
  }
  
  return {
    title: guestSession.title,
    messages: guestMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      products: msg.products || [],
    })),
  };
}

/**
 * Product list storage utilities
 */
export interface BriefProduct {
  id: string;
  name: string;
  category: string;
  specifications: string[];
  addedDate: string;
  image_link: string;
}

const STORAGE_KEY_PRODUCTS = 'brief_products';

export function getStoredProducts(): BriefProduct[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}

export function saveProduct(product: BriefProduct): void {
  if (typeof window === 'undefined') return;
  
  // Prevent guest users from adding products
  if (!isAuthenticated()) {
    console.warn('Cannot save product: User is not authenticated');
    throw new Error('You must be logged in to add products to your list');
  }
  
  try {
    const products = getStoredProducts();
    products.push(product);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
}

export function deleteProduct(productId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const products = getStoredProducts().filter((p) => p.id !== productId);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (error) {
    console.error('Error deleting product:', error);
  }
}

/**
 * Enquiry storage utilities
 */
export interface EnquiryProduct {
  productId: string;
  quantity: number;
  deliveryDate: string;
  targetPrice: number;
}

export interface ShippingAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface Enquiry {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  products?: EnquiryProduct[];
  shippingAddress?: ShippingAddress;
}

const STORAGE_KEY_ENQUIRIES = 'brief_enquiries';

export function getStoredEnquiries(): Enquiry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ENQUIRIES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading enquiries:', error);
    return [];
  }
}

export function saveEnquiry(enquiry: Enquiry): void {
  if (typeof window === 'undefined') return;
  
  try {
    const enquiries = getStoredEnquiries();
    const index = enquiries.findIndex((e) => e.id === enquiry.id);
    
    if (index >= 0) {
      enquiries[index] = enquiry;
    } else {
      enquiries.push(enquiry);
    }
    
    localStorage.setItem(STORAGE_KEY_ENQUIRIES, JSON.stringify(enquiries));
  } catch (error) {
    console.error('Error saving enquiry:', error);
  }
}

export function deleteEnquiry(enquiryId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const enquiries = getStoredEnquiries().filter((e) => e.id !== enquiryId);
    localStorage.setItem(STORAGE_KEY_ENQUIRIES, JSON.stringify(enquiries));
  } catch (error) {
    console.error('Error deleting enquiry:', error);
  }
}

