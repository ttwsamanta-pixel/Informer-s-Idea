'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
export function AuthForm({ mode }: { mode: string }) {
  const router = useRouter();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const login = mode === 'login',
    reset = mode === 'reset-password';
  return (
    <div className="admin-auth">
      <Link href="/" className="admin-brand">
        <img src="/logo/icon.svg" alt="" width="44" height="44" />
        <span>
          Informer’s <em>Idea</em>
          <small>Administration</small>
        </span>
      </Link>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const body = reset
              ? {
                  token: new URLSearchParams(location.search).get('token'),
                  password: f.get('password'),
                }
              : login
                ? { email: f.get('email'), password: f.get('password') }
                : { email: f.get('email') };
            const result = await api<{ message: string }>('auth/' + mode, {
              method: 'POST',
              body: JSON.stringify(body),
            });
            if (login) {
              router.replace('/admin');
              router.refresh();
            } else setMessage(result.message);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="admin-eyebrow">YOUR WORKSPACE</span>
        <h1>
          {login
            ? 'Welcome back'
            : reset
              ? 'Choose a new password'
              : 'Reset your password'}
        </h1>
        <p>
          {login
            ? 'Sign in to manage your tools, content and audience.'
            : 'We’ll help you securely access your account.'}
        </p>
        {!reset && (
          <label>
            Email address
            <input name="email" type="email" required autoComplete="username" />
          </label>
        )}
        {(login || reset) && (
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={reset ? 12 : 1}
              maxLength={128}
              autoComplete={login ? 'current-password' : 'new-password'}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="admin-success">
            {message}
          </p>
        )}
        <button className="admin-primary" disabled={busy}>
          {busy
            ? 'Please wait…'
            : login
              ? 'Sign in'
              : reset
                ? 'Update password'
                : 'Send reset link'}
        </button>
        <Link href={login ? '/admin/forgot-password' : '/admin/login'}>
          {login ? 'Forgot password?' : 'Back to sign in'}
        </Link>
      </form>
      <small>Secure access · Informer’s Idea</small>
    </div>
  );
}
