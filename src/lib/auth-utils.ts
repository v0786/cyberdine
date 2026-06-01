'use client';

import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  code?: string;
  provider?: string;
}

export class AuthService {
  private static instance: AuthService;
  private supabase;

  private constructor() {
    this.supabase = createClient();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Secure token storage using Supabase Auth (handled by Supabase)
  public async loginWithProvider(provider: 'google' | 'github' | 'apple' | 'azure' | 'stream') {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: this.getProviderScopes(provider),
        },
      });
      return { success: !error, error };
    } catch (error: any) {
      return {
        success: false, error: this.normalizeError(error) };
    }
  }

  public async loginWithEmail(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: this.normalizeError(error) };
    }
  }

  public async signUpWithEmail(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: this.normalizeError(error) };
    }
  }

  public async logout() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.normalizeError(error) };
    }
  }

  public async getCurrentSession() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return { success: true, session };
    } catch (error: any) {
      return { success: false, error: this.normalizeError(error) };
    }
  }

  public onAuthStateChange(callback: (session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }

  private getProviderScopes(provider: string) {
    const scopes: Record<string, string> = {
      google: 'email profile',
      github: 'user:email',
      apple: 'email name',
      azure: 'openid profile email',
      stream: '',
    };
    return scopes[provider] || '';
  }

  private normalizeError(error: any): AuthError {
    if (typeof error === 'string') {
      return { message: error };
    }
    if (error?.message) {
      return {
        message: error.message,
        code: error.code,
        provider: error.provider,
      };
    }
    return { message: 'An unexpected error occurred' };
  }
}

export const getErrorMessage = (error: AuthError) => {
  const messages: Record<string, string> = {
    invalid_credentials: 'Invalid email or password',
    email_not_confirmed: 'Please verify your email first',
    user_not_found: 'No user found with these credentials',
    access_denied: 'Access was denied',
    provider_error: 'Error with the authentication provider',
    over_email_already_exists: 'An account with this email already exists',
    weak_password: 'Password is too weak. Please use a stronger password',
  };
  return messages[error.code || ''] || error.message;
};
