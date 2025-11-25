import React, { useEffect, useState } from 'react';
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
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState<number>(0);

  useEffect(() => {
    const lastSent = Number(localStorage.getItem('otpLastSentAt') || 0);
    const elapsed = Date.now() - lastSent;
    if (elapsed < 60_000) {
      setCooldownMs(60_000 - elapsed);
    }
    const t = setInterval(() => {
      setCooldownMs((prev) => (prev > 0 ? prev - 1000 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

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

  const handleMagicLink = async () => {
    if (!supabase) return;
    setFeedback(null);
    setError(null);

    if (cooldownMs > 0) {
      setError('Veuillez patienter avant de renvoyer un lien.');
      return;
    }
    if (!email) {
      setError('Merci de saisir un email.');
      return;
    }
    if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      setError('Email hors domaine autorisé.');
      return;
    }

    const { error: signErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname + window.location.hash
      }
    });
    if (signErr) {
      setError(signErr.message);
    } else {
      setFeedback("Lien de connexion envoyé. Vérifiez votre boîte mail.");
      localStorage.setItem('otpLastSentAt', String(Date.now()));
      setCooldownMs(60_000);
    }
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
          <p className="text-slate-500">Entrez votre email pour recevoir un lien de connexion.</p>
          <div className="space-y-3 text-left">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={allowedDomain ? `email@${allowedDomain}` : 'email'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={handleMagicLink}
              disabled={cooldownMs > 0}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cooldownMs > 0 ? `Renvoyer dans ${Math.ceil(cooldownMs / 1000)}s` : 'Envoyer le lien de connexion'}
            </button>
            {feedback && <p className="text-sm text-emerald-600">{feedback}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {allowedDomain && (
              <p className="text-xs text-slate-500">Accès limité au domaine: {allowedDomain}</p>
            )}
          </div>
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
