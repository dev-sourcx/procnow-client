/**
 * API utility functions for communicating with the backend
 */

// Main backend (chat, products, etc.)
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';
// Separate auth backend (login/signup). Falls back to main API if not set.
const API_URL = process.env.NEXT_PUBLIC_API_URL || AI_API_URL;

// ===== Auth types =====
export interface SignupPayload {
  email: string;
  password: string;
  phone_number: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  phone_number: string;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  detail?: any;
}

/**
 * Sign up a new user
 * Calls: POST /api/v1/auth/signup
 */
export async function signup(payload: SignupPayload): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = 'Signup failed';
    try {
      const data: ApiErrorResponse = await response.json();
      if (data.message) errorMessage = data.message;
    } catch {
      const text = await response.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Log in a user and get JWT token
 * Calls: POST /api/v1/auth/login
 */
export async function login(email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let errorMessage = 'Login failed';
    try {
      const data: ApiErrorResponse = await response.json();
      if (data.message) errorMessage = data.message;
    } catch {
      const text = await response.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get the currently authenticated user using the stored JWT token
 * Calls: GET /api/v1/auth/me
 */
export async function getCurrentUser(token: string): Promise<CurrentUser> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Not authenticated');
  }

  return response.json();
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
            // Stream completed
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

