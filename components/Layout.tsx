import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, PlusCircle } from 'lucide-react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!isSupabaseEnabled);

  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const loadUser = async () => {
      const { data } = await supabase!.auth.getUser();
      setUserEmail(data.user?.email ?? null);
      setAuthReady(true);
    };
    loadUser();

    const { data: listener } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthReady(true);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseEnabled && supabase) {
      await supabase.auth.signOut();
      setUserEmail(null);
    }
  };

  const navItems = [
    { name: 'Tableau de bord', to: '/', icon: LayoutDashboard },
    { name: 'Devis', to: '/quotes', icon: FileText },
    { name: 'Clients & Projets', to: '/clients', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Devis<span className="text-indigo-500">Pro</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium tracking-wide uppercase">Manager v1.2</p>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium'
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-inner border border-white/10">
                        {userEmail ? userEmail[0]?.toUpperCase() : 'ME'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-white text-sm font-semibold truncate">{userEmail || 'Utilisateur'}</p>
                        <p className="text-xs text-slate-500 truncate">{isSupabaseEnabled ? (userEmail ? 'Connecté' : authReady ? 'Déconnecté' : 'Connexion...') : 'Mode local'}</p>
                    </div>
                </div>
                {isSupabaseEnabled && (
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-slate-300 hover:text-white bg-slate-800/70 px-2 py-1 rounded-md border border-slate-700 hover:border-slate-500 transition"
                  >
                    Se déconnecter
                  </button>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col relative bg-slate-50/50">
         <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
             <div>
                <h2 className="text-xl font-bold text-slate-800">Gestion Commerciale</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pilotez votre activité simplement</p>
             </div>
             
             <div className="flex items-center gap-4">
                 <div className="h-8 w-px bg-slate-200 mx-2"></div>
                 <NavLink to="/quotes/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-indigo-200 active:scale-95">
                     <PlusCircle size={18} />
                     Nouveau Devis
                 </NavLink>
             </div>
         </header>
         <div className="p-8 max-w-7xl mx-auto w-full">
            {children}
         </div>
      </main>
    </div>
  );
};

export default Layout;
