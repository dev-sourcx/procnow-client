'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveAuthToken, getGuestSessionData, deleteGuestSession } from '@/lib/storage';
import { syncGuestSession } from '@/lib/api';
import { getAndClearRedirectPath } from '@/lib/auth';

function GoogleAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthSuccess = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const redirect = searchParams.get('redirect') || '/';

      if (error) {
        // Redirect to login with error
        router.push('/login?error=oauth_failed');
        return;
      }

      if (token) {
        try {
          // Store token
          saveAuthToken(token);
          
          // Sync guest session if exists
          const guestData = getGuestSessionData();
          if (guestData) {
            try {
              await syncGuestSession(token, guestData);
              // Clear guest session after successful sync
              deleteGuestSession();
            } catch (syncError) {
              console.error('Error syncing guest session:', syncError);
              // Continue even if sync fails - user is still logged in
            }
          }
          
          // Get redirect path from stored path or use provided/default
          const redirectPath = getAndClearRedirectPath() || redirect;
          
          // Reload page to trigger AuthContext to refresh
          // Or redirect after a short delay
          setTimeout(() => {
            window.location.href = redirectPath;
          }, 500);
        } catch (err) {
          console.error('Error storing token:', err);
          router.push('/login?error=oauth_failed');
        }
      } else {
        // No token received, redirect to login
        router.push('/login?error=oauth_failed');
      }
    };

    handleAuthSuccess();
  }, [searchParams, router]);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </main>
  );
}

export default function GoogleAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      }
    >
      <GoogleAuthSuccessContent />
    </Suspense>
  );
}
