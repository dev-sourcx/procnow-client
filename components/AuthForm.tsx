'use client';

import Link from 'next/link';
import { useState } from 'react';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const title = isLogin ? 'Log in' : 'Create account';
  const subtitle = isLogin
    ? 'Welcome back! Please log in to continue.'
    : 'Join us to start chatting.';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: wire up with your auth API here
    console.log(`${isLogin ? 'Login' : 'Signup'} form submitted`, {
      email,
      password,
      name: isLogin ? undefined : name,
    });
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
              <label className="mb-1 block text-sm text-gray-300" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
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

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-600"
          >
            {isLogin ? 'Log in' : 'Create account'}
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

