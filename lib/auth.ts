/**
 * Authentication utilities for protecting actions
 */

import { getAuthToken } from './storage';

const REDIRECT_KEY = 'auth_redirect_after_login';

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return !!token;
}

/**
 * Require authentication before performing an action
 * If not authenticated, stores the redirect path and redirects to login
 * @param redirectPath - The path to redirect to after login (optional, defaults to current path)
 * @returns true if authenticated, false if redirected to login
 */
export function requireAuth(redirectPath?: string): boolean {
  if (isAuthenticated()) {
    return true;
  }

  // Store the intended path to redirect after login
  const path = redirectPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(REDIRECT_KEY, path);
  }

  // Redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }

  return false;
}

/**
 * Get the stored redirect path and clear it
 * @returns The path to redirect to, or null if none
 */
export function getAndClearRedirectPath(): string | null {
  if (typeof window === 'undefined') return null;

  const path = sessionStorage.getItem(REDIRECT_KEY);
  if (path) {
    sessionStorage.removeItem(REDIRECT_KEY);
    return path;
  }

  return null;
}

/**
 * Store a redirect path (for custom actions)
 */
export function setRedirectPath(path: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(REDIRECT_KEY, path);
  }
}

