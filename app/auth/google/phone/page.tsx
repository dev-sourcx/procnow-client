'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGoogleAuthUrl } from '@/lib/api';
import PhoneNumberInput from '@/components/PhoneNumberInput';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

function PhoneCollectionContent() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneError(null);
    setIsLoading(true);

    try {
      // Validate phone number
      if (!phone || phone.trim().length === 0) {
        setPhoneError('Phone number is required');
        setIsLoading(false);
        return;
      }

      if (phone.length < 7) {
        setPhoneError('Phone number must be at least 7 digits');
        setIsLoading(false);
        return;
      }

      // Get selected country dial code
      const countries = [
        { code: 'US', dialCode: '+1' }, { code: 'IN', dialCode: '+91' }, { code: 'GB', dialCode: '+44' },
        { code: 'CA', dialCode: '+1' }, { code: 'AU', dialCode: '+61' }, { code: 'DE', dialCode: '+49' },
        { code: 'FR', dialCode: '+33' }, { code: 'IT', dialCode: '+39' }, { code: 'ES', dialCode: '+34' },
        { code: 'NL', dialCode: '+31' }, { code: 'BE', dialCode: '+32' }, { code: 'CH', dialCode: '+41' },
        { code: 'AT', dialCode: '+43' }, { code: 'SE', dialCode: '+46' }, { code: 'NO', dialCode: '+47' },
        { code: 'DK', dialCode: '+45' }, { code: 'FI', dialCode: '+358' }, { code: 'PL', dialCode: '+48' },
        { code: 'CZ', dialCode: '+420' }, { code: 'GR', dialCode: '+30' }, { code: 'PT', dialCode: '+351' },
        { code: 'IE', dialCode: '+353' }, { code: 'NZ', dialCode: '+64' }, { code: 'SG', dialCode: '+65' },
        { code: 'MY', dialCode: '+60' }, { code: 'TH', dialCode: '+66' }, { code: 'PH', dialCode: '+63' },
        { code: 'ID', dialCode: '+62' }, { code: 'VN', dialCode: '+84' }, { code: 'JP', dialCode: '+81' },
        { code: 'KR', dialCode: '+82' }, { code: 'CN', dialCode: '+86' }, { code: 'HK', dialCode: '+852' },
        { code: 'TW', dialCode: '+886' }, { code: 'AE', dialCode: '+971' }, { code: 'SA', dialCode: '+966' },
        { code: 'IL', dialCode: '+972' }, { code: 'TR', dialCode: '+90' }, { code: 'ZA', dialCode: '+27' },
        { code: 'EG', dialCode: '+20' }, { code: 'NG', dialCode: '+234' }, { code: 'KE', dialCode: '+254' },
        { code: 'BR', dialCode: '+55' }, { code: 'MX', dialCode: '+52' }, { code: 'AR', dialCode: '+54' },
        { code: 'CL', dialCode: '+56' }, { code: 'CO', dialCode: '+57' }, { code: 'PE', dialCode: '+51' },
        { code: 'RU', dialCode: '+7' }, { code: 'UA', dialCode: '+380' },
      ];
      const selectedCountry = countries.find(c => c.code === countryCode) || countries[0];
      const fullPhoneNumber = selectedCountry.dialCode + phone;

      // Store phone number in sessionStorage as backup
      sessionStorage.setItem('google_signup_phone', fullPhoneNumber);

      // Get Google OAuth URL with phone in state parameter
      // The phone will be passed through OAuth flow and returned in callback
      const authUrl = await getGoogleAuthUrl('/auth/google/success', fullPhoneNumber);
      
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        setError('Failed to initiate Google Sign-In');
        setIsLoading(false);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to proceed with Google signup. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[rgb(19,25,33)] px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(19,25,33)] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex-1">
              Google Sign Up
            </h1>
            <div className="flex-1 flex justify-end">
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please provide your phone number to continue with Google sign up
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300" htmlFor="phone">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <PhoneNumberInput
              value={phone}
              onChange={setPhone}
              countryCode={countryCode}
              onCountryChange={setCountryCode}
              required
              error={phoneError || undefined}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[rgb(19,25,33)] px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white transition hover:bg-gray-50 dark:hover:bg-[rgb(25,31,41)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Redirecting to Google...' : 'Continue with Google'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <span>
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Log in
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}

export default function PhoneCollectionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[rgb(19,25,33)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </main>
      }
    >
      <PhoneCollectionContent />
    </Suspense>
  );
}
