'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { login, signup, getGoogleAuthUrl, syncGuestSession, verifyEmailOtp } from '@/lib/api';
import { saveAuthToken, getGuestSessionData } from '@/lib/storage';
import { getAndClearRedirectPath } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import googleLogo from '@/images/google.png';
import PhoneNumberInput from '@/components/PhoneNumberInput';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === 'login';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const title = isLogin ? 'Log in' : 'Create account';
  const subtitle = isLogin
    ? 'Welcome back! Please log in to continue.'
    : 'Join us to start chatting.';

  // Check for OAuth errors in URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'oauth_failed') {
        setError('Google authentication failed. Please try again.');
      } else if (errorParam === 'oauth_not_configured') {
        setError('Google Sign-In is not configured. Please use email/password login.');
      } else if (errorParam === 'invalid_google_data') {
        setError('Unable to retrieve user information from Google.');
      }
      // Remove error from URL
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('error');
      router.replace(`?${newSearchParams.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  const handleGoogleSignIn = async () => {
    if (!isLogin) {
      // For signup, show phone modal first
      setShowPhoneModal(true);
      return;
    }

    // For login, proceed directly to Google OAuth
    try {
      setGoogleLoading(true);
      setError(null);
      const authUrl = await getGoogleAuthUrl();
      if (authUrl) {
        // Redirect to Google OAuth in the same tab
        window.location.href = authUrl;
      } else {
        setError('Failed to initiate Google Sign-In');
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google Sign-In');
      setGoogleLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setError(null);

    try {
      // Validate phone number
      if (!phone || phone.trim().length === 0) {
        setPhoneError('Phone number is required');
        return;
      }

      if (phone.length < 7) {
        setPhoneError('Phone number must be at least 7 digits');
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
      setGoogleLoading(true);
      const authUrl = await getGoogleAuthUrl('/auth/google/success', fullPhoneNumber);

      if (authUrl) {
        // Close modal and redirect to Google OAuth in the same tab
        setShowPhoneModal(false);
        window.location.href = authUrl;
      } else {
        setError('Failed to initiate Google Sign-In');
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to proceed with Google signup. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let result;
      if (isLogin) {
        // Call backend login endpoint
        result = await login(email, password);
      } else {
        // Signup: backend expects email, password, name
        result = await signup({
          email,
          password,
          name,
        });

        // For signup, move to OTP verification step before storing token and redirecting
        if (!result.token) {
          throw new Error('Signup did not return a token');
        }
        setSignupToken(result.token);
        setIsOtpStep(true);
        setIsSubmitting(false);
        return;
      }

      // For login success, proceed as before
      if (isLogin) {
        // Mark that user came from login to prevent beforeunload from clearing guest session
        localStorage.setItem('came_from_login', 'true');

        // Save token
        saveAuthToken(result.token);

        // Sync guest session if exists
        const guestData = getGuestSessionData();
        if (guestData) {
          try {
            const syncedSession = await syncGuestSession(result.token, guestData);
            if (syncedSession && syncedSession._id) {
              sessionStorage.setItem('synced_session_id', syncedSession._id);
            }
          } catch (syncError) {
            console.error('Error syncing guest session:', syncError);
          }
        }

        const redirectPath = getAndClearRedirectPath();
        router.push(redirectPath || '/');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[rgb(19,25,33)] px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(19,25,33)] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex-1">{title}</h1>
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
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>

        {!isOtpStep ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[rgb(19,25,33)] px-3 py-2 text-gray-900 dark:text-white outline-none transition focus:border-gray-500 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[rgb(19,25,33)] px-3 py-2 text-gray-900 dark:text-white outline-none transition focus:border-gray-500 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[rgb(19,25,33)] px-3 py-2 text-gray-900 dark:text-white outline-none transition focus:border-gray-500 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (isLogin ? 'Logging in...' : 'Creating account...') : isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setIsSubmitting(true);
              try {
                if (!signupToken) {
                  throw new Error('Missing signup token. Please sign up again.');
                }
                if (!otp.trim()) {
                  throw new Error('Please enter the OTP sent to your email.');
                }

                const result = await verifyEmailOtp(signupToken, otp.trim());
                if (!result.isEmailVerified) {
                  throw new Error('Email verification failed.');
                }

                // Mark that user came from login to prevent beforeunload from clearing guest session
                localStorage.setItem('came_from_login', 'true');

                // Save token after successful verification
                saveAuthToken(signupToken);

                // Sync guest session if exists
                const guestData = getGuestSessionData();
                if (guestData) {
                  try {
                    const syncedSession = await syncGuestSession(signupToken, guestData);
                    if (syncedSession && syncedSession._id) {
                      sessionStorage.setItem('synced_session_id', syncedSession._id);
                    }
                  } catch (syncError) {
                    console.error('Error syncing guest session:', syncError);
                  }
                }

                const redirectPath = getAndClearRedirectPath();
                router.push(redirectPath || '/');
              } catch (err) {
                if (err instanceof Error) {
                  setError(err.message);
                } else {
                  setError('Failed to verify email. Please try again.');
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                Enter the 6-digit code sent to your email
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#2b2c36] px-3 py-2 text-gray-900 dark:text-white outline-none transition focus:border-gray-500 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 tracking-widest text-center"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-[rgb(19,25,33)] text-gray-600 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[rgb(19,25,33)] px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white transition hover:bg-gray-50 dark:hover:bg-[rgb(25,31,41)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          {googleLoading ? 'Loading...' : 'Continue with Google'}
        </button>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? (
            <span>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Sign up
              </Link>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Log in
              </Link>
            </span>
          )}
        </div>
      </div>

      {/* Phone Number Modal for Google Signup */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(19,25,33)] p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Phone Number
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhone('');
                  setPhoneError(null);
                  setError(null);
                }}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
                aria-label="Close modal"
              >
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
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <p className="mb-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
              Enter your phone number to continue
            </p>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
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
                <p className="text-xs text-red-400 whitespace-nowrap overflow-hidden text-ellipsis" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhoneModal(false);
                    setPhone('');
                    setPhoneError(null);
                    setError(null);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[rgb(19,25,33)] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap min-w-0"
                >
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                  <span className="truncate">{googleLoading ? 'Redirecting...' : 'Continue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

