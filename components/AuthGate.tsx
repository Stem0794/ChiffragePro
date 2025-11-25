import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface Props {
  children: React.ReactNode;
}

const allowedDomain = (import.meta.env.VITE_ALLOWED_GOOGLE_DOMAIN || '').toLowerCase().trim();

const AuthGate: React.FC<Props> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseEnabled);
  const [domainAllowed, setDomainAllowed] = useState(true);

  const checkDomain = (currentSession: Session | null) => {
    if (!allowedDomain) return true; // no restriction set
    const email = currentSession?.user?.email?.toLowerCase();
    if (!email) return false;
    return email.endsWith(`@${allowedDomain}`);
  };

  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase!.auth.getSession();
      const currentSession = data.session ?? null;
      setSession(currentSession);
      setDomainAllowed(checkDomain(currentSession));
      setLoading(false);
    };

    load();

    const { data: listener } = supabase!.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setDomainAllowed(checkDomain(newSession));
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname + window.location.hash
      }
    });
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  if (!isSupabaseEnabled) {
    // No remote backend configured, bypass auth
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full" aria-label="Chargement..." />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="bg-white shadow-lg rounded-xl p-10 border border-slate-200 text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Connexion requise</h1>
          <p className="text-slate-500">Connectez-vous avec Google pour accéder à ChiffragePro.</p>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition"
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  if (!domainAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="bg-white shadow-lg rounded-xl p-10 border border-slate-200 text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-slate-600">Ce compte Google n'appartient pas au domaine autorisé.</p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-medium shadow-md transition"
          >
            Changer de compte
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;

