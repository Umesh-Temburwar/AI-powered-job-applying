import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, AuthSession } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface RegisterResult {
  needsEmailVerification: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  signInWithGithub: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync Supabase user into application AuthUser model
  const syncSession = useCallback((sbSession: typeof supabase.auth.getSession extends () => Promise<{ data: { session: infer S } }> ? S : unknown) => {
    if (!sbSession || !('user' in (sbSession as object))) {
      setUser(null);
      setSession(null);
      return;
    }
    const current = sbSession as {
      access_token: string;
      expires_at?: number;
      user: {
        id: string;
        email?: string;
        user_metadata?: {
          full_name?: string;
          name?: string;
          user_name?: string;
          [key: string]: unknown;
        };
      };
    };

    const userMeta = current.user.user_metadata || {};
    const candidateName =
      userMeta.full_name ||
      userMeta.name ||
      userMeta.user_name ||
      (current.user.email ? current.user.email.split('@')[0] : 'Candidate');

    const authUser: AuthUser = {
      id: current.user.id,
      email: current.user.email || '',
      fullName: candidateName,
    };

    setUser(authUser);
    setSession({
      user: authUser,
      token: current.access_token,
      expiresAt: (current.expires_at || 0) * 1000,
    });
  }, []);

  // Initialize session restoration and listen to auth state changes
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        if (isMounted) {
          syncSession(data.session);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to restore session');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        syncSession(currentSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const login = async (email: string, password: string) => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.'
      );
    }

    const { data, error: loginErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginErr) {
      throw new Error(loginErr.message);
    }

    syncSession(data.session);
  };

  const register = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<RegisterResult> => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.'
      );
    }

    const emailRedirectTo = `${window.location.origin}/auth/confirm`;
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo,
      },
    });

    if (signUpErr) {
      throw new Error(signUpErr.message);
    }

    // If email confirmation is required, session is null
    const needsEmailVerification = !data.session;
    if (data.session) {
      syncSession(data.session);
    }

    return { needsEmailVerification };
  };

  const resendVerificationEmail = async (email: string) => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.'
      );
    }

    const emailRedirectTo = `${window.location.origin}/auth/confirm`;
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo,
      },
    });

    if (resendErr) {
      throw new Error(resendErr.message);
    }
  };

  const logout = async () => {
    setError(null);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }

    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (resetErr) {
      throw new Error(resetErr.message);
    }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      throw new Error(updateErr.message);
    }
  };

  const signInWithGithub = async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.'
      );
    }

    const redirectTo = `${window.location.origin}/auth/confirm`;
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
      },
    });

    if (oauthErr) {
      throw new Error(oauthErr.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        error,
        login,
        register,
        logout,
        resetPassword,
        updatePassword,
        resendVerificationEmail,
        signInWithGithub,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
