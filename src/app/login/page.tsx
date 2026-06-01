'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialLoginButton } from '@/components/SocialLoginButton';
import { AuthService, getErrorMessage } from '@/lib/auth-utils';
import { LogIn, UserPlus, Home, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const router = useRouter();
  const authService = AuthService.getInstance();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = isSignUp
      ? await authService.signUpWithEmail(email, password)
      : await authService.loginWithEmail(email, password);

    setLoading(false);

    if (!result.success) {
      setError(getErrorMessage(result.error!));
      return;
    }
    router.push('/dashboard');
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'apple' | 'azure' | 'stream') => {
    setLoadingProvider(provider);
    setError(null);
    const result = await authService.loginWithProvider(provider);
    setLoadingProvider(null);
    if (!result.success) {
      setError(getErrorMessage(result.error!));
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
      <Card id="login-card" className="w-full max-w-md mx-4 bg-[#0a0a0a] border-zinc-800">
        <CardHeader id="login-header" className="text-center">
          <Link href="/" id="login-brand-link" className="mb-4 inline-block hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center gap-3">
              <div id="login-brand-logo" className="h-12 w-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span id="login-brand-logo-text" className="text-black font-bold text-2xl">C</span>
              </div>
              <div className="text-left">
                <h1 id="login-brand-title" className="text-3xl font-bold text-yellow-500">CYBERDINE</h1>
                <p id="login-brand-subtitle" className="text-zinc-400 text-sm">Time Is Malleable. Shape It Wisely.</p>
              </div>
            </div>
          </Link>

          <CardTitle id="login-title">{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
          <CardDescription id="login-description">
            {isSignUp 
              ? 'Create an account to access the dashboard' 
              : 'Enter your credentials to access the dashboard'}
          </CardDescription>
        </CardHeader>

        <CardContent id="login-content" className="space-y-6">
          {error && (
            <div id="error-alert" className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p id="error-text" className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Social Login Buttons */}
          <div id="social-login-container" className="space-y-3">
            <SocialLoginButton provider="google" onClick={() => handleSocialLogin('google')} loading={loadingProvider === 'google'} />
            <SocialLoginButton provider="github" onClick={() => handleSocialLogin('github')} loading={loadingProvider === 'github'} />
            <SocialLoginButton provider="apple" onClick={() => handleSocialLogin('apple')} loading={loadingProvider === 'apple'} />
            <SocialLoginButton provider="azure" onClick={() => handleSocialLogin('azure')} loading={loadingProvider === 'azure'} />
            <SocialLoginButton provider="stream" onClick={() => handleSocialLogin('stream')} loading={loadingProvider === 'stream'} />
          </div>

          {/* Divider */}
          <div id="divider-container" className="relative">
            <div id="divider-line" className="absolute inset-0 flex items-center">
              <span id="divider-border" className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span id="divider-text" className="bg-[#0a0a0a] px-2 text-zinc-500">Or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form id="email-login-form" onSubmit={handleEmailAuth} className="space-y-4">
            <div id="email-field" className="space-y-2">
              <Label id="label-email" htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-700"
              />
            </div>

            <div id="password-field" className="space-y-2">
              <Label id="label-password" htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-700"
              />
            </div>

            <Button
              id="btn-submit-auth"
              type="submit"
              className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
              disabled={loading}
            >
              {loading 
                ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                : (isSignUp ? <><UserPlus className="h-4 w-4 mr-2" /> Create Account</> : <><LogIn className="h-4 w-4 mr-2" /> Sign In</>)}
            </Button>
          </form>

          {/* Toggle Auth Mode */}
          <div id="auth-mode-toggle" className="text-center">
            <p className="text-sm text-zinc-400">
              {isSignUp 
                ? "Already have an account? " 
                : "Don't have an account? "}
              <button
                id="btn-toggle-auth-mode"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-yellow-500 hover:underline font-medium"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </CardContent>

        {/* Footer */}
        <div id="login-footer" className="px-8 pb-6 text-center">
          <Link
            href="/"
            id="btn-home-link"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-yellow-500 transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to Homepage
          </Link>
        </div>
      </Card>
    </div>
  );
}
