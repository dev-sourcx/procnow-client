'use client';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastPayload {
  type: ToastType;
  message: string;
}

const TOAST_EVENT = 'app-toast';

export function showToast(payload: ToastPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: payload }));
}

export function subscribeToToast(
  handler: (payload: ToastPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<ToastPayload>;
    handler(customEvent.detail);
  };

  window.addEventListener(TOAST_EVENT, listener);

  return () => {
    window.removeEventListener(TOAST_EVENT, listener);
  };
}


