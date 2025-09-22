/**
 * Authentication hook for admin users
 * Manages Supabase auth session and admin role checking
 */
import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignInResult {
  success: boolean;
  error?: string;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    isAdmin: false
  });

  // Check if user has admin role
  const checkAdminRole = (user: User | null): boolean => {
    if (!user) return false;
    const roles = user.app_metadata?.roles || [];
    return roles.includes('admin');
  };

  // Update auth state
  const updateAuthState = (session: Session | null) => {
    const user = session?.user || null;
    const isAdmin = checkAdminRole(user);

    setAuthState({
      session,
      user,
      loading: false,
      isAdmin
    });
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthState(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in function
  const signIn = async (credentials: SignInCredentials): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        // Convert Supabase errors to Danish
        let errorMessage = 'Der opstod en fejl ved login';

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Ugyldig e-mail eller adgangskode';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'E-mail skal bekræftes før login';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'For mange login-forsøg. Prøv igen senere';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      // Check if user has admin role
      const isAdmin = checkAdminRole(data.user);
      if (!isAdmin) {
        // Sign out non-admin users immediately
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Kun administratorer har adgang til dette område'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: 'Der opstod en uventet fejl ved login'
      };
    }
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Refresh session function
  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }
      updateAuthState(data.session);
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  // Get access token for API calls
  const getAccessToken = (): string | null => {
    return authState.session?.access_token || null;
  };

  return {
    // Auth state
    ...authState,

    // Auth methods
    signIn,
    signOut,
    refreshSession,
    getAccessToken,

    // Computed properties
    isAuthenticated: !!authState.session,
    isAdminAuthenticated: !!authState.session && authState.isAdmin
  };
}