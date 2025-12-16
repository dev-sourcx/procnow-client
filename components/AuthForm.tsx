'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, signup } from '@/lib/api';
import { saveAuthToken } from '@/lib/storage';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === 'login';
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = isLogin ? 'Log in' : 'Create account';
  const subtitle = isLogin
    ? 'Welcome back! Please log in to continue.'
    : 'Join us to start chatting.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        // Call backend login endpoint
        const token = await login(email, password);
        saveAuthToken(token.access_token);
        // Redirect to main app area after login
        router.push('/brief');
      } else {
        // Signup: backend expects email, password, phone_number
        await signup({
          email,
          password,
          phone_number: phoneNumber,
        });
        // After successful signup, redirect to login
        router.push('/login');
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
    <div className="flex min-h-screen items-center justify-center bg-[#343541] px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#202123] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Your phone number"
                required
                className="w-full rounded-lg border border-gray-700 bg-[#2b2c36] px-3 py-2 text-white outline-none transition focus:border-gray-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-gray-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-gray-700 bg-[#2b2c36] px-3 py-2 text-white outline-none transition focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-gray-700 bg-[#2b2c36] px-3 py-2 text-white outline-none transition focus:border-gray-500"
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

        <div className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? (
            <span>
              Don’t have an account?{' '}
              <Link href="/signup" className="text-indigo-400 hover:underline">
                Sign up
              </Link>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 hover:underline">
                Log in
              </Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

