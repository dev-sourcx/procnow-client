'use client';

import { useEffect, useState } from 'react';
import { subscribeToToast, type ToastPayload } from '@/lib/toast';

interface ToastWithId extends ToastPayload {
  id: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastWithId[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToast((payload) => {
      const id = Date.now();
      const toast: ToastWithId = { id, ...payload };
      setToasts((prev) => [...prev, toast]);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[260px] max-w-sm px-5 py-4 rounded-xl shadow-xl text-sm font-semibold text-white ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-slate-700'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}


