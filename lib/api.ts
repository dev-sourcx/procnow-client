/**
 * API utility functions for communicating with the backend
 */

// Main backend (chat, products, etc.)
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';
// Separate auth backend (login/signup) - Node.js backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ===== Auth types =====
export interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

export interface TokenResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export interface ProductSheetItem {
  _id?: string;
  productSource: string;
  adminProductId?: string | null;
  externalRef?: string | null;
  displayName?: string | null;
  category?: string | null;
  userAttributes?: Record<string, any>;
}

export interface ProductSheet {
  id: string | null;
  userId: string;
  productSheetItems: ProductSheetItem[];
  itemCount: number;
}

export interface AddProductItemPayload {
  productSource: string;
  adminProductId?: string;
  externalRef?: string;
  displayName?: string;
  category?: string;
  userAttributes?: Record<string, any>;
}

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface Enquiry {
  _id?: string;
  userId: string;
  enquiryName: string;
  shippingAddress: Address;
  billingAddress: Address;
  expectedDeliveryDate: string | Date;
  enquiryStatus: string;
  enquiryNotes?: string;
  attachment?: string;
  enquiryProducts: ProductSheetItem[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateEnquiryPayload {
  enquiryName: string;
  shippingAddress: Address;
  billingAddress: Address;
  expectedDeliveryDate: string | Date;
  enquiryStatus: string;
  enquiryNotes?: string;
  attachment?: string;
  enquiryProducts: string[]; // Array of ProductSheetItem IDs
}

export interface UpdateEnquiryPayload {
  enquiryName?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  expectedDeliveryDate?: string | Date;
  enquiryStatus?: string;
  enquiryNotes?: string;
  attachment?: string;
  enquiryProducts?: string[];
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
  detail?: any;
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Sign up a new user
 * Calls: POST /api/auth/signup
 */
export async function signup(payload: SignupPayload): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseData: ApiSuccessResponse<TokenResponse> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    const errorMessage = errorResponse.message || errorResponse.error || 'Signup failed';
    throw new Error(errorMessage);
  }

  return (responseData as ApiSuccessResponse<TokenResponse>).data;
}

/**
 * Log in a user and get JWT token
 * Calls: POST /api/auth/login
 */
export async function login(email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const responseData: ApiSuccessResponse<TokenResponse> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    const errorMessage = errorResponse.message || errorResponse.error || 'Login failed';
    throw new Error(errorMessage);
  }

  return (responseData as ApiSuccessResponse<TokenResponse>).data;
}

/**
 * Get the currently authenticated user using the stored JWT token
 * Calls: GET /api/auth/me
 */
export async function getCurrentUser(token: string): Promise<CurrentUser> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<CurrentUser> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Not authenticated');
  }

  return (responseData as ApiSuccessResponse<CurrentUser>).data;
}

/**
 * Get Google OAuth authorization URL
 * Calls: GET /api/auth/google
 */
export async function getGoogleAuthUrl(): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const responseData: ApiSuccessResponse<{ authUrl: string }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get Google OAuth URL');
  }

  return (responseData as ApiSuccessResponse<{ authUrl: string }>).data.authUrl;
}

/**
 * Get user's product sheet
 * Calls: GET /api/product-sheet
 */
export async function getProductSheet(token: string): Promise<ProductSheet> {
  const response = await fetch(`${API_URL}/api/product-sheet`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<ProductSheet> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get product sheet');
  }

  return (responseData as ApiSuccessResponse<ProductSheet>).data;
}

/**
 * Add a product item to user's product sheet
 * Calls: POST /api/product-sheet/items
 */
export async function addProductItem(
  token: string,
  payload: AddProductItemPayload
): Promise<ProductSheetItem> {
  const response = await fetch(`${API_URL}/api/product-sheet/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData: ApiSuccessResponse<{ productSheetItem: ProductSheetItem }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to add product item');
  }

  return (responseData as ApiSuccessResponse<{ productSheetItem: ProductSheetItem }>).data.productSheetItem;
}

/**
 * Delete a product item from user's product sheet
 * Calls: DELETE /api/product-sheet/items/:itemId
 */
export async function deleteProductItem(token: string, itemId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/product-sheet/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{}> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to delete product item');
  }
}

/**
 * Create a new enquiry
 * Calls: POST /api/enquiries
 */
export async function createEnquiry(
  token: string,
  payload: CreateEnquiryPayload
): Promise<Enquiry> {
  const response = await fetch(`${API_URL}/api/enquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData: ApiSuccessResponse<{ enquiry: Enquiry }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to create enquiry');
  }

  return (responseData as ApiSuccessResponse<{ enquiry: Enquiry }>).data.enquiry;
}

/**
 * Get all enquiries for the authenticated user
 * Calls: GET /api/enquiries
 */
export async function getEnquiries(token: string): Promise<Enquiry[]> {
  const response = await fetch(`${API_URL}/api/enquiries`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ enquiries: Enquiry[] }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get enquiries');
  }

  return (responseData as ApiSuccessResponse<{ enquiries: Enquiry[] }>).data.enquiries;
}

/**
 * Get a single enquiry by ID
 * Calls: GET /api/enquiries/:enquiryId
 */
export async function getEnquiry(token: string, enquiryId: string): Promise<Enquiry> {
  const response = await fetch(`${API_URL}/api/enquiries/${enquiryId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ enquiry: Enquiry }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get enquiry');
  }

  return (responseData as ApiSuccessResponse<{ enquiry: Enquiry }>).data.enquiry;
}

/**
 * Update an enquiry
 * Calls: PUT /api/enquiries/:enquiryId
 */
export async function updateEnquiry(
  token: string,
  enquiryId: string,
  payload: UpdateEnquiryPayload
): Promise<Enquiry> {
  const response = await fetch(`${API_URL}/api/enquiries/${enquiryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData: ApiSuccessResponse<{ enquiry: Enquiry }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to update enquiry');
  }

  return (responseData as ApiSuccessResponse<{ enquiry: Enquiry }>).data.enquiry;
}

/**
 * Delete an enquiry
 * Calls: DELETE /api/enquiries/:enquiryId
 */
export async function deleteEnquiry(token: string, enquiryId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/enquiries/${enquiryId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{}> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to delete enquiry');
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  _id: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ChatMessageResponse {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: any[];
  createdAt: string | Date;
}

export interface ChatRequest {
  history: ChatMessage[];
  message: string;
}

export interface Product {
  _id: string;
  product_name: string;
  usage: string[];
  product_category: string;
  description: string;
  dynamic_attributes: Record<string, string>;
  vendor: string;
  image_link: string;
}

/**
 * Check if the backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_API_URL}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * Get all chat sessions for the authenticated user
 * Calls: GET /api/chat/sessions
 */
export async function getChatSessions(token: string): Promise<ChatSession[]> {
  const response = await fetch(`${API_URL}/api/chat/sessions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ sessions: ChatSession[] }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get chat sessions');
  }

  return (responseData as ApiSuccessResponse<{ sessions: ChatSession[] }>).data.sessions;
}

/**
 * Create a new chat session
 * Calls: POST /api/chat/sessions
 */
export async function createChatSession(
  token: string,
  title: string
): Promise<ChatSession> {
  const response = await fetch(`${API_URL}/api/chat/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });

  const responseData: ApiSuccessResponse<{ session: ChatSession }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to create chat session');
  }

  return (responseData as ApiSuccessResponse<{ session: ChatSession }>).data.session;
}

/**
 * Update a chat session
 * Calls: PUT /api/chat/sessions/:sessionId
 */
export async function updateChatSession(
  token: string,
  sessionId: string,
  title: string
): Promise<ChatSession> {
  const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });

  const responseData: ApiSuccessResponse<{ session: ChatSession }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to update chat session');
  }

  return (responseData as ApiSuccessResponse<{ session: ChatSession }>).data.session;
}

/**
 * Delete a chat session
 * Calls: DELETE /api/chat/sessions/:sessionId
 */
export async function deleteChatSession(token: string, sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{}> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to delete chat session');
  }
}

/**
 * Get all messages for a chat session
 * Calls: GET /api/chat/sessions/:sessionId/messages
 */
export async function getChatMessages(
  token: string,
  sessionId: string
): Promise<ChatMessageResponse[]> {
  const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ messages: ChatMessageResponse[] }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get chat messages');
  }

  return (responseData as ApiSuccessResponse<{ messages: ChatMessageResponse[] }>).data.messages;
}

/**
 * Create a new chat message
 * Calls: POST /api/chat/sessions/:sessionId/messages
 */
export async function createChatMessageBackend(
  token: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  products?: any[]
): Promise<ChatMessageResponse> {
  const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role, content, products: products || [] }),
  });

  const responseData: ApiSuccessResponse<{ message: ChatMessageResponse }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to create chat message');
  }

  return (responseData as ApiSuccessResponse<{ message: ChatMessageResponse }>).data.message;
}

/**
 * Update a chat message (useful for streaming updates)
 * Calls: PUT /api/chat/messages/:messageId
 */
export async function updateChatMessageBackend(
  token: string,
  messageId: string,
  content?: string,
  products?: any[]
): Promise<ChatMessageResponse> {
  const response = await fetch(`${API_URL}/api/chat/messages/${messageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content, products }),
  });

  const responseData: ApiSuccessResponse<{ message: ChatMessageResponse }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to update chat message');
  }

  return (responseData as ApiSuccessResponse<{ message: ChatMessageResponse }>).data.message;
}

/**
 * Sync guest session and messages to database
 * Calls: POST /api/chat/sync-guest-session
 */
export async function syncGuestSession(
  token: string,
  sessionData: { title: string; messages: Array<{ role: 'user' | 'assistant'; content: string; products?: any[] }> }
): Promise<ChatSession> {
  const response = await fetch(`${API_URL}/api/chat/sync-guest-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sessionData),
  });

  const responseData: ApiSuccessResponse<{ session: ChatSession }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to sync guest session');
  }

  return (responseData as ApiSuccessResponse<{ session: ChatSession }>).data.session;
}

/**
 * Extract product data from Python dict string and convert to JSON
 */
function extractProductsFromText(text: string): { cleanedText: string; products: Product[] | null } {
  // Find the start of the product dict pattern
  const startPattern = /\{'type':\s*['"]products['"]/;
  const startMatch = text.search(startPattern);
  
  if (startMatch === -1) {
    return { cleanedText: text, products: null };
  }

  // Find the matching closing brace by counting brackets
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let dictStart = -1;
  
  for (let i = startMatch; i < text.length; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : '';
    
    // Handle string detection
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) dictStart = i;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && dictStart !== -1) {
          // Found the complete dict
          const dictString = text.substring(dictStart, i + 1);

          // Always clean the text by removing the dict block
          const before = text.substring(0, dictStart).trim();
          const after = text.substring(i + 1).trim();
          const cleanedText = (before + ' ' + after).trim();

          try {
            // Convert Python dict-like string to a JavaScript object literal and evaluate it.
            // 1) Normalize ObjectId('...') to just "..." so it becomes a plain string.
            // 2) Leave single-quoted strings as-is so inner apostrophes like "Kid's" remain valid.
            const jsLike = dictString.replace(
              /ObjectId\(['"]([^'"]+)['"]\)/g,
              '"$1"'
            );

            // Evaluate as JS object literal. This string is produced by our own backend.
            // eslint-disable-next-line no-new-func
            const parsed = Function('"use strict"; return (' + jsLike + ');')();
            
            if (parsed.type === 'products' && Array.isArray(parsed.data)) {
              return { cleanedText, products: parsed.data };
            }
          } catch (error) {
            console.warn('Failed to parse product data from text:', error);
            // Even if parsing fails, still return the cleaned text without the dict
            return { cleanedText, products: null };
          }
          
          break;
        }
      }
    }
  }

  return { cleanedText: text, products: null };
}

/**
 * Send a chat message and stream the response from /stream endpoint
 */
export async function sendChatMessage(
  history: ChatMessage[],
  message: string,
  onChunk: (chunk: string) => void,
  onProducts?: (products: Product[]) => void,
  onDone?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    // Add the latest user message to history
    const fullHistory: ChatMessage[] = [...history, { role: 'user', content: message }];

    const response = await fetch(`${AI_API_URL}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: fullHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get response: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (lines ending with \n\n)
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        // Parse SSE format: "data: {...}" or "data: [DONE]"
        if (line.startsWith('data: ')) {
          const data = line.substring(6); // Remove "data: " prefix

          if (data.trim() === '[DONE]') {
            // Stream completed - notify callback
            if (onDone) {
              onDone();
            }
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle streaming assistant text tokens
            if (parsed.type === 'token' && parsed.text) {
              // Stream the token text directly for incremental rendering
              onChunk(parsed.text);
            }

            
            // Handle dedicated products event
            if (parsed.type === 'products' && parsed.data && onProducts) {
              onProducts(parsed.data);
            }
          } catch (parseError) {
            // If it's not JSON, check if it contains product data as Python dict
            if (data.trim()) {
              const { cleanedText, products } = extractProductsFromText(data);
              if (cleanedText) {
                onChunk(cleanedText);
              }
              if (products && onProducts) {
                onProducts(products);
              }
            }
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data.trim() === '[DONE]') {
            // Stream completed - notify callback
            if (onDone) {
              onDone();
            }
            continue;
          }
          if (data.trim() !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'token' && parsed.text) {
                // Stream the token text directly for incremental rendering
                onChunk(parsed.text);
              }
              if (parsed.type === 'products' && parsed.data && onProducts) {
                onProducts(parsed.data);
              }
            } catch {
              // If not JSON, check if it contains product data as Python dict
              const { cleanedText, products } = extractProductsFromText(data);
              if (cleanedText) {
                onChunk(cleanedText);
              }
              if (products && onProducts) {
                onProducts(products);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
    if (onError) {
      onError(
        error instanceof Error
          ? error
          : new Error('Unknown error occurred')
      );
    } else {
      throw error;
    }
  }
}

export async function getProducts(): Promise<Record<string, Product[]>> {
  const response = await fetch(`${AI_API_URL}/products`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

export interface GeneratedField {
  label: string;
  type: 'dropdown' | 'text' | 'number' | 'textarea' | 'file';
  options?: string[];
  placeholder?: string;
}

export interface GeneratedFieldsResponse {
  item: string;
  fields: GeneratedField[];
}

/**
 * Generate fields from product keyword
 */
export async function generateFieldsFromKeyword(keyword: string): Promise<GeneratedFieldsResponse> {
  const response = await fetch(`${AI_API_URL}/generate-fields-from-keywords`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyword: keyword,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to generate fields: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  return response.json();
}

/**
 * Generate fields from product description/data
 */
export async function generateFieldsFromDescription(data: Record<string, any>): Promise<GeneratedFieldsResponse> {
  const response = await fetch(`${AI_API_URL}/generate-fields-from-description`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: data,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to generate fields: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  return response.json();
}

// Quote Types
export interface Quote {
  _id?: string;
  vendorAssignmentId: any;
  unitPrice?: string;
  deliveryDate?: string | Date;
  validTill?: string | Date;
  description?: string;
  attachment?: string;
  visibletoClient: boolean;
  quoteStatus: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Get all quotes for the authenticated buyer (quotes visible to client)
 * Calls: GET /api/enquiries/quotes
 */
export async function getBuyerQuotes(token: string): Promise<Quote[]> {
  const response = await fetch(`${API_URL}/api/enquiries/quotes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ quotes: Quote[] }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get quotes');
  }

  return (responseData as ApiSuccessResponse<{ quotes: Quote[] }>).data.quotes;
}

