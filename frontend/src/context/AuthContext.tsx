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
  getToken: () => Promise<string | null>;
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

    const adminEmails = ['umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com'];
    const userEmail = (current.user.email || '').trim().toLowerCase();
    const isAdmin = Boolean(
      (userEmail && adminEmails.includes(userEmail)) ||
      (userMeta && (userMeta as Record<string, unknown>).role === 'admin')
    );

    const authUser: AuthUser = {
      id: current.user.id,
      email: current.user.email || '',
      fullName: candidateName,
      isAdmin,
    };

    setUser((prev) => {
      if (
        prev &&
        prev.id === authUser.id &&
        prev.email === authUser.email &&
        prev.fullName === authUser.fullName &&
        prev.isAdmin === authUser.isAdmin
      ) {
        return prev;
      }
      return authUser;
    });

    setSession((prev) => {
      if (prev && prev.token === current.access_token && prev.user.id === authUser.id) {
        return prev;
      }
      return {
        user: authUser,
        token: current.access_token,
        expiresAt: (current.expires_at || 0) * 1000,
      };
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        if (!isSupabaseConfigured) {
          setIsLoading(false);
          return;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('Error reading session:', sessionError);
        }

        if (isMounted) {
          if (data?.session) {
            syncSession(data.session);
          } else {
            setUser(null);
            setSession(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Initialization error in AuthContext:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        syncSession(currentSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [syncSession]);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      throw new Error('Supabase client is not configured.');
    }

    const { data, error: loginErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (loginErr) {
      setError(loginErr.message);
      throw loginErr;
    }

    if (data.session) {
      syncSession(data.session);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<RegisterResult> => {
    setError(null);
    setIsLoading(true);

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      throw new Error('Supabase client is not configured.');
    }

    const { data, error: regErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setIsLoading(false);

    if (regErr) {
      setError(regErr.message);
      throw regErr;
    }

    const needsEmailVerification = !data.session;
    return { needsEmailVerification };
  };

  const logout = async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const signInWithGithub = async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      throw oauthError;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    setError(null);
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });

    if (resendErr) {
      setError(resendErr.message);
      throw resendErr;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    setIsLoading(true);

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      throw new Error('Supabase is not configured.');
    }

    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    setIsLoading(false);

    if (resetErr) {
      setError(resetErr.message);
      throw resetErr;
    }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    setIsLoading(true);

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      throw new Error('Supabase is not configured.');
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (updateErr) {
      setError(updateErr.message);
      throw updateErr;
    }
  };

  const getToken = async (): Promise<string | null> => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
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
        getToken,
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
