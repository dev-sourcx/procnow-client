import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

function SignupForm() {
  return <AuthForm mode="signup" />;
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#343541]">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}

