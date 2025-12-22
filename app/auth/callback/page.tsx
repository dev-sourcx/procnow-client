'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveAuthToken } from '@/lib/storage';
import { getAndClearRedirectPath } from '@/lib/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      try {
        // Save the token
        saveAuthToken(token);
        
        // Get redirect path or default to home
        const redirectPath = getAndClearRedirectPath();
        router.push(redirectPath || '/');
      } catch (err) {
        setError('Failed to complete authentication');
        console.error('Auth callback error:', err);
      }
    } else {
      setError('No authentication token received');
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#343541] px-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#202123] p-8 shadow-xl text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Authentication Error</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#343541] px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#202123] p-8 shadow-xl text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-300">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#343541] px-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#202123] p-8 shadow-xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

