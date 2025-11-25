
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { Quote, Client, Project, QuoteStatus } from '../types';
import { Search, Filter, MoreVertical, Copy, Edit3, Trash2, Eye, User } from 'lucide-react';
import { sanitizeText } from '../services/sanitize';

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
      setLoading(true);
      try {
        const [quotesData, clientsData, projectsData] = await Promise.all([
          StorageService.getQuotes(),
          StorageService.getClients(),
          StorageService.getProjects()
        ]);
        setQuotes(quotesData);
        setClients(clientsData);
        setProjects(projectsData);
      } finally {
        setLoading(false);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("Êtes-vous sûr de vouloir supprimer ce devis ?")) {
          try {
            await StorageService.deleteQuote(id);
          } catch (err) {
            alert("La suppression du devis a échoué. Réessayez.");
          }
          await refresh();
      }
  };

  const handleDuplicate = async (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    const isVersion = window.confirm("Voulez-vous créer une nouvelle version (V" + (quote.version + 1) + ") de ce devis ?\nAnnuler pour faire une copie simple.");
    
    const newQuote: Quote = {
        ...quote,
        id: crypto.randomUUID(),
        reference: isVersion ? quote.reference : `${quote.reference}-COPY`,
        version: isVersion ? quote.version + 1 : 1,
        status: QuoteStatus.DRAFT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    try {
      await StorageService.saveQuote(newQuote);
      await refresh();
      navigate(`/quotes/edit/${newQuote.id}`);
    } catch (err) {
      alert("La duplication a échoué. Vérifiez votre connexion.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    const quoteToUpdate = quotes.find(q => q.id === id);
    if (quoteToUpdate) {
        const updatedQuote = { ...quoteToUpdate, status: newStatus, updatedAt: new Date().toISOString() };
        try {
          await StorageService.saveQuote(updatedQuote);
          await refresh();
        } catch (err) {
          alert("Impossible de mettre à jour le statut.");
        }
    }
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.companyName || 'Inconnu';
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Inconnu';

  const statusColors = {
    [QuoteStatus.DRAFT]: 'bg-slate-100 text-slate-700 border-slate-200',
    [QuoteStatus.ESTIMATE]: 'bg-purple-100 text-purple-800 border-purple-200',
    [QuoteStatus.SENT]: 'bg-amber-100 text-amber-800 border-amber-200',
    [QuoteStatus.ACCEPTED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [QuoteStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
    [QuoteStatus.PENDING]: 'bg-orange-100 text-orange-800 border-orange-200',
    [QuoteStatus.LATE]: 'bg-pink-100 text-pink-800 border-pink-200',
  };

  const statusLabels = {
      [QuoteStatus.DRAFT]: 'Brouillon',
      [QuoteStatus.ESTIMATE]: 'Chiffrage',
      [QuoteStatus.SENT]: 'Envoyé',
      [QuoteStatus.ACCEPTED]: 'Accepté',
      [QuoteStatus.REJECTED]: 'Rejeté',
      [QuoteStatus.PENDING]: 'En attente',
      [QuoteStatus.LATE]: 'En retard',
  }

  const filteredQuotes = quotes
    .filter(q => {
        const matchesText = 
            q.reference.toLowerCase().includes(filterText.toLowerCase()) || 
            getClientName(q.clientId).toLowerCase().includes(filterText.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
        const matchesClient = clientFilter === 'ALL' || q.clientId === clientFilter;
        return matchesText && matchesStatus && matchesClient;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Rechercher par réf, mot-clé..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-shadow"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filtre Client */}
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200">
                <User size={18} />
                <select 
                    className="bg-transparent text-sm outline-none font-medium cursor-pointer max-w-[150px]"
                    value={clientFilter}
                    onChange={e => setClientFilter(e.target.value)}
                >
                    <option value="ALL">Tous les clients</option>
                    {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.companyName}</option>
                    ))}
                </select>
            </div>

            {/* Filtre Statut */}
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200">
                <Filter size={18} />
                <select 
                    className="bg-transparent text-sm outline-none font-medium cursor-pointer"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">Tous les statuts</option>
                    {Object.values(QuoteStatus).map(s => (
                        <option key={s} value={s}>{statusLabels[s]}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="px-6 py-5">Référence</th>
              <th className="px-6 py-5">Client / Projet</th>
              <th className="px-6 py-5">Date</th>
              <th className="px-6 py-5">Montant HT</th>
              <th className="px-6 py-5">Statut</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredQuotes.map(quote => (
              <tr 
                key={quote.id} 
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                onClick={() => navigate(`/quotes/edit/${quote.id}`)}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{quote.reference}</div>
                  <div className="text-xs text-slate-400 font-medium">v{quote.version}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-slate-800">{getClientName(quote.clientId)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{getProjectName(quote.projectId)}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                  {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800">
                  {quote.totalAmount.toLocaleString('fr-FR')} €
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                   <div className="relative inline-block w-full max-w-[140px]">
                      <select
                        value={quote.status}
                        onChange={(e) => handleStatusChange(quote.id, e.target.value as QuoteStatus)}
                        className={`appearance-none w-full pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-all ${statusColors[quote.status]}`}
                      >
                        {Object.values(QuoteStatus).map(s => (
                            <option key={s} value={s} className="bg-white text-slate-800 font-medium py-1">
                                {statusLabels[s]}
                            </option>
                        ))}
                      </select>
                      {/* Chevron Icon */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-60">
                         <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleDuplicate(quote, e)} className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors" title="Dupliquer / Nouvelle Version">
                        <Copy size={18} />
                    </button>
                    <button onClick={(e) => {e.stopPropagation(); navigate(`/quotes/edit/${quote.id}`)}} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors" title="Voir / Éditer">
                        {quote.status === QuoteStatus.DRAFT ? <Edit3 size={18} /> : <Eye size={18} />}
                    </button>
                    <button onClick={(e) => handleDelete(quote.id, e)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredQuotes.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                        <div className="mb-2 p-4 bg-slate-50 rounded-full">
                           <Search size={24} className="opacity-50" />
                        </div>
                        <p>Aucun devis trouvé pour ces critères.</p>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Quotes;
