
import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { Quote, QuoteStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Euro, FileClock, CheckCircle, TrendingUp, PieChart, AlertCircle, Clock } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    setQuotes(StorageService.getQuotes());
  }, []);

  const totalRevenue = quotes
    .filter(q => q.status === QuoteStatus.ACCEPTED)
    .reduce((acc, q) => acc + q.totalAmount, 0);

  // Include Sent, Estimates, Pending, and Late in pending amount (Pipeline)
  const pendingAmount = quotes
    .filter(q => [QuoteStatus.SENT, QuoteStatus.ESTIMATE, QuoteStatus.PENDING, QuoteStatus.LATE].includes(q.status))
    .reduce((acc, q) => acc + q.totalAmount, 0);

  const totalQuotes = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === QuoteStatus.ACCEPTED).length;
  const acceptanceRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  // Chart Data preparation
  const data = [
    { name: 'Brouillon', value: quotes.filter(q => q.status === QuoteStatus.DRAFT).length, color: '#cbd5e1' },
    { name: 'Chiffrage', value: quotes.filter(q => q.status === QuoteStatus.ESTIMATE).length, color: '#a78bfa' },
    { name: 'Envoyé', value: quotes.filter(q => q.status === QuoteStatus.SENT).length, color: '#fbbf24' },
    { name: 'En attente', value: quotes.filter(q => q.status === QuoteStatus.PENDING).length, color: '#fb923c' },
    { name: 'En retard', value: quotes.filter(q => q.status === QuoteStatus.LATE).length, color: '#f472b6' },
    { name: 'Accepté', value: quotes.filter(q => q.status === QuoteStatus.ACCEPTED).length, color: '#34d399' },
    { name: 'Rejeté', value: quotes.filter(q => q.status === QuoteStatus.REJECTED).length, color: '#f87171' },
  ];

  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, iconColor, borderColor }: any) => (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-default relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${borderColor}`}></div>
      <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
            <Icon size={24} className={iconColor} />
          </div>
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${subtext.includes('+') || subtext.includes('Accepté') ? 'text-emerald-600' : 'text-slate-400'}`}>
          {subtext}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-slate-900">Tableau de bord</h3>
        <p className="text-slate-500 mt-1">Vue d'ensemble de votre performance commerciale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Chiffre d'Affaires"
          value={`${totalRevenue.toLocaleString('fr-FR')} €`}
          subtext="Total validé (HT)"
          icon={Euro}
          colorClass="bg-emerald-100"
          iconColor="text-emerald-600"
          borderColor="bg-emerald-500"
        />
        <StatCard
          title="Pipeline"
          value={`${pendingAmount.toLocaleString('fr-FR')} €`}
          subtext="Devis en cours (Envoi/Retard...)"
          icon={FileClock}
          colorClass="bg-amber-100"
          iconColor="text-amber-600"
          borderColor="bg-amber-500"
        />
        <StatCard
          title="Transformation"
          value={`${acceptanceRate}%`}
          subtext="Taux d'acceptation global"
          icon={PieChart}
          colorClass="bg-indigo-100"
          iconColor="text-indigo-600"
          borderColor="bg-indigo-500"
        />
        <StatCard
          title="Volume"
          value={acceptedQuotes}
          subtext={`Sur ${totalQuotes} devis émis`}
          icon={CheckCircle}
          colorClass="bg-blue-100"
          iconColor="text-blue-600"
          borderColor="bg-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-slate-800">Répartition des Devis</h4>
              <div className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded">Par statut</div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} 
                    dy={10} 
                    interval={0}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11}} 
                />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    labelStyle={{color: '#64748b', fontWeight: 600, marginBottom: '0.25rem'}}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
            <div className="bg-indigo-50 p-5 rounded-full mb-6">
                <TrendingUp size={36} className="text-indigo-600" />
            </div>
            <h4 className="text-xl font-bold text-slate-800">Objectif Mensuel</h4>
            <p className="text-slate-500 mt-2 text-sm px-4 leading-relaxed">
                Vous avez atteint <span className="font-bold text-indigo-700">65%</span> de votre objectif de 10k€. Continuez comme ça !
            </p>
            <div className="w-full bg-slate-100 rounded-full h-3 mt-8 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]" style={{ width: '65%' }}></div>
            </div>
            <div className="flex justify-between w-full mt-2 text-xs font-semibold text-slate-400">
                <span>0€</span>
                <span>10 000€</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
