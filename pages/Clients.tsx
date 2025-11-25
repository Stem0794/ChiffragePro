
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Client, Project } from '../types';
import { Plus, User, Briefcase, Building, MapPin, Mail, Trash2, Edit2, Check, ArrowRight, X, Save, DollarSign, LayoutTemplate } from 'lucide-react';
import { sanitizeText } from '../services/sanitize';

const COMMON_ROLES = [
  "UX/UI designer",
  "Art Director",
  "Developer",
  "Data Analyst",
  "CDP Senior",
  "CDP",
  "Directeur projet",
  "Directeur technique",
  "Directeur de production",
  "Tech lead",
  "SRE"
];

const TjmManager: React.FC<{
  tjms: Record<string, number>, 
  onChange: (newTjms: Record<string, number>) => void,
  placeholder?: string
}> = ({ tjms, onChange, placeholder }) => {
  const [newRole, setNewRole] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>('');

  const handleAdd = () => {
    if (newRole && newPrice !== '') {
      onChange({ ...tjms, [newRole]: Number(newPrice) });
      setNewRole('');
      setNewPrice('');
    }
  };

  const handleRemove = (role: string) => {
    const next = { ...tjms };
    delete next[role];
    onChange(next);
  };

  const handlePriceChange = (role: string, price: number) => {
    onChange({ ...tjms, [role]: price });
  };

  return (
    <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <DollarSign size={12} /> Grille Tarifaire (TJM)
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
        {Object.entries(tjms).map(([role, price]) => (
          <div key={role} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-100 group hover:border-indigo-100 transition-colors">
             <div className="flex-1 text-xs text-slate-700 font-semibold truncate" title={role}>
               {role}
             </div>
             <div className="flex items-center">
                 <input 
                    type="number" 
                    className="w-16 text-right text-xs border-b border-slate-300 bg-white px-1 py-0.5 focus:border-indigo-500 outline-none font-medium text-slate-800 rounded-sm"
                    value={String(price)}
                    onChange={(e) => handlePriceChange(role, Number(e.target.value))}
                 />
                 <span className="text-[10px] text-slate-500 ml-1">€</span>
             </div>
             <button onClick={() => handleRemove(role)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
               <X size={12} />
             </button>
          </div>
        ))}
        {Object.keys(tjms).length === 0 && (
          <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded">{placeholder || "Aucun tarif défini."}</p>
        )}
      </div>

      <div className="flex gap-1 pt-2 border-t border-slate-100">
        <input 
           list="common-roles"
           className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
           placeholder="Rôle..."
           value={newRole}
           onChange={e => setNewRole(e.target.value)}
        />
        <datalist id="common-roles">
          {COMMON_ROLES.map(r => <option key={r} value={r} />)}
        </datalist>
        <input 
           type="number"
           className="w-16 text-xs border border-slate-300 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
           placeholder="Prix"
           value={newPrice === '' ? '' : String(newPrice)}
           onChange={e => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <button 
          onClick={handleAdd}
          className="bg-slate-800 text-white p-1.5 rounded hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!newRole || newPrice === ''}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Form states
  const [showClientForm, setShowClientForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  
  // Creation States
  const [newClient, setNewClient] = useState<Partial<Client>>({ 
    name: '', companyName: '', email: '', 
    defaultTjms: { 
      "UX/UI designer": 720,
      "Art Director": 920,
      "Developer": 880,
      "Data Analyst": 880,
      "CDP Senior": 720,
      "CDP": 650,
      "Directeur projet": 920,
      "Directeur technique": 1400,
      "Directeur de production": 1050,
      "Tech lead": 1050,
      "SRE": 1050
    }
  });
  const [newProject, setNewProject] = useState<Partial<Project>>({ 
    name: '', specificTjms: {} 
  });

  // Editing States
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientData, setEditClientData] = useState<Partial<Client>>({});
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectData, setEditProjectData] = useState<Partial<Project>>({});

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [clientsData, projectsData] = await Promise.all([
        StorageService.getClients(),
        StorageService.getProjects()
      ]);
      setClients(clientsData);
      setProjects(projectsData);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.companyName) return;
    const client: Client = {
      id: crypto.randomUUID(),
      name: sanitizeText(newClient.name!),
      companyName: sanitizeText(newClient.companyName!),
      email: sanitizeText(newClient.email || ''),
      address: sanitizeText(newClient.address || ''),
      defaultTjms: newClient.defaultTjms || {},
    };
    const updatedClients = [...clients, client];
    setClients(updatedClients);
    try {
      await StorageService.saveClients(updatedClients);
      await refreshData();
    } catch (e) {
      alert("Impossible d'enregistrer le client. Vérifiez votre connexion.");
    }
    setShowClientForm(false);
    setNewClient({ name: '', companyName: '', email: '', defaultTjms: { "Chef de projet": 600, "Full stack developer": 500 } });
  };

  const handleUpdateClient = async () => {
    if (!selectedClientId || !editClientData.companyName) return;
    const updatedClients = clients.map(c => 
        c.id === selectedClientId ? { 
          ...c, 
          companyName: sanitizeText(editClientData.companyName || ''),
          name: sanitizeText(editClientData.name || ''),
          email: sanitizeText(editClientData.email || ''),
          address: sanitizeText(editClientData.address || ''),
          defaultTjms: editClientData.defaultTjms || {}
        } as Client : c
    );
    setClients(updatedClients);
    try {
      await StorageService.saveClients(updatedClients);
      await refreshData();
    } catch (e) {
      alert("Impossible de mettre à jour le client.");
    }
    setIsEditingClient(false);
  };
  
  const handleDeleteClient = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?\nCette action est irréversible et supprimera tous les projets et devis associés.")) {
        setClients(prev => prev.filter(c => c.id !== id));
        setProjects(prev => prev.filter(p => p.clientId !== id));
        setEditingProjectId(null);
        
        if (selectedClientId === id) {
           setSelectedClientId(null);
           setIsEditingClient(false);
        }
        
        try {
          await StorageService.deleteClient(id);
        } catch (err) {
          alert("La suppression n'a pas abouti côté serveur. Réessayez.");
        }
        await refreshData();
    }
  };

  const handleStartEditClient = (client: Client) => {
      setEditClientData({...client});
      setIsEditingClient(true);
  };

  const handleAddProject = async () => {
    if (!selectedClientId || !newProject.name) return;
    const project: Project = {
      id: crypto.randomUUID(),
      clientId: selectedClientId,
      name: sanitizeText(newProject.name!),
      description: sanitizeText(newProject.description || '', 1000),
      specificTjms: newProject.specificTjms,
    };
    const updatedProjects = [...projects, project];
    setProjects(updatedProjects);
    try {
      await StorageService.saveProjects(updatedProjects);
      await refreshData();
    } catch (e) {
      alert("Impossible d'enregistrer le projet.");
    }
    setShowProjectForm(false);
    setNewProject({ name: '', specificTjms: {} });
  };

  const handleStartEditProject = (project: Project) => {
      setEditProjectData({...project});
      setEditingProjectId(project.id);
  };

  const handleUpdateProject = async () => {
    if (!editingProjectId || !editProjectData.name) return;
    const updatedProjects = projects.map(p => 
        p.id === editingProjectId ? { 
          ...p, 
          name: sanitizeText(editProjectData.name || ''),
          description: sanitizeText(editProjectData.description || '', 1000),
          specificTjms: editProjectData.specificTjms || {}
        } as Project : p
    );
    setProjects(updatedProjects);
    try {
      await StorageService.saveProjects(updatedProjects);
      await refreshData();
    } catch (e) {
      alert("Impossible de mettre à jour le projet.");
    }
    setEditingProjectId(null);
  };
  
  const handleDeleteProject = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    if(window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?\nCette action est irréversible.")) {
        setProjects(prev => prev.filter(p => p.id !== id));
        setEditingProjectId(null);
        
        try {
          await StorageService.deleteProject(id);
        } catch (err) {
          alert("La suppression n'a pas abouti côté serveur.");
        }
        await refreshData();
    }
  };

  const filteredProjects = selectedClientId 
    ? projects.filter(p => p.clientId === selectedClientId)
    : [];

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Clients List - Sticky Sidebar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <User size={20} className="text-indigo-600" /> Clients
          </h3>
          <button 
            onClick={() => setShowClientForm(true)}
            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Plus size={20} />
          </button>
        </div>
        
        {showClientForm && (
          <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4 overflow-y-auto max-h-[500px] shadow-inner shrink-0">
            <h4 className="text-sm font-bold text-slate-700">Nouveau Client</h4>
            <input 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
              placeholder="Nom du Contact" 
              value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})}
            />
            <input 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
              placeholder="Entreprise" 
              value={newClient.companyName} onChange={e => setNewClient({...newClient, companyName: e.target.value})}
            />
             <input 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
              placeholder="Email" 
              value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})}
            />
            
            <TjmManager 
                tjms={newClient.defaultTjms || {}} 
                onChange={(tjms) => setNewClient({...newClient, defaultTjms: tjms})} 
            />

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowClientForm(false)} className="text-sm text-slate-500 hover:text-slate-800 px-2 font-medium">Annuler</button>
              <button onClick={handleAddClient} className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium shadow-sm">Enregistrer</button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-3 space-y-2 bg-slate-50/30 custom-scrollbar">
          {clients.map(client => (
            <div 
              key={client.id} 
              onClick={() => { setSelectedClientId(client.id); setIsEditingClient(false); }}
              className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 group flex justify-between items-center ${
                selectedClientId === client.id 
                  ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
              <div className="overflow-hidden">
                <h4 className={`font-bold text-base truncate ${selectedClientId === client.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                  {client.companyName}
                </h4>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{client.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                 <button 
                     type="button"
                     onClick={(e) => handleDeleteClient(client.id, e)}
                     className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                     title="Supprimer ce client"
                 >
                    <Trash2 size={16} />
                 </button>
                 {selectedClientId === client.id && (
                    <ArrowRight size={16} className="text-indigo-600" />
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail & Projects */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {selectedClientId ? (
          <>
            {/* Client Detail Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shrink-0">
                {isEditingClient ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                             <h2 className="text-xl font-bold text-slate-900">Modifier le Client</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Entreprise</label>
                                <input 
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={editClientData.companyName || ''} 
                                    onChange={e => setEditClientData({...editClientData, companyName: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Nom du Contact</label>
                                <input 
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={editClientData.name || ''} 
                                    onChange={e => setEditClientData({...editClientData, name: e.target.value})} 
                                />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Email</label>
                                <input 
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={editClientData.email || ''} 
                                    onChange={e => setEditClientData({...editClientData, email: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Adresse</label>
                                <input 
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={editClientData.address || ''} 
                                    onChange={e => setEditClientData({...editClientData, address: e.target.value})} 
                                />
                            </div>
                        </div>
                        
                        <div className="pt-2">
                             <TjmManager 
                                tjms={editClientData.defaultTjms || {}} 
                                onChange={(tjms) => setEditClientData({...editClientData, defaultTjms: tjms})} 
                            />
                        </div>

                         <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setIsEditingClient(false)} className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded font-medium">Annuler</button>
                            <button onClick={handleUpdateClient} className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium shadow-sm">
                                <Save size={16} /> Enregistrer
                            </button>
                         </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{selectedClient?.companyName}</h2>
                                <div className="flex items-center gap-2 text-slate-500 mt-1">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">Client</span>
                                    <span className="text-sm font-medium text-slate-700">{selectedClient?.name}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => selectedClient && handleStartEditClient(selectedClient)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Modifier les infos"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => selectedClient && handleDeleteClient(selectedClient.id, e)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-10 relative"
                                    title="Supprimer le client"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-700 text-sm">
                                <div className="p-2 bg-white rounded-full text-indigo-500 shadow-sm"><Mail size={16} /></div>
                                {selectedClient?.email || 'Email non renseigné'}
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 text-sm">
                                <div className="p-2 bg-white rounded-full text-indigo-500 shadow-sm"><MapPin size={16} /></div>
                                {selectedClient?.address || 'Adresse non renseignée'}
                            </div>
                        </div>

                        {/* Compact TJM View for Client */}
                        <div className="mt-6">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Tarifs Négociés (TJM)</h5>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(selectedClient?.defaultTjms || {}).map(([role, price]) => (
                                    <span key={role} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-sm">
                                        <span className="font-semibold text-indigo-600 mr-2">{role}</span> {price}€
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Projects List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col relative">
                 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl z-10">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <Briefcase size={20} className="text-indigo-600" /> Projets
                    </h3>
                    <button 
                        onClick={() => setShowProjectForm(true)}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-all shadow-md active:scale-95"
                    >
                        + Nouveau Projet
                    </button>
                </div>

                {showProjectForm && (
                     <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4 shadow-inner">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-slate-700">Création Projet</h4>
                            <button onClick={() => setShowProjectForm(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45" /></button>
                        </div>
                        
                        <input 
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                            placeholder="Nom du projet" 
                            value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})}
                        />
                        <textarea 
                             className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white" 
                             rows={2}
                             placeholder="Description courte (optionnel)" 
                             value={newProject.description || ''} onChange={e => setNewProject({...newProject, description: e.target.value})}
                        />

                        <TjmManager 
                            tjms={newProject.specificTjms || {}} 
                            onChange={(tjms) => setNewProject({...newProject, specificTjms: tjms})} 
                            placeholder="Pas de tarifs spécifiques (utilise ceux du client)"
                        />

                        <div className="flex justify-end gap-3 pt-2">
                             <button onClick={() => setShowProjectForm(false)} className="text-sm text-slate-500 hover:text-slate-800 px-2 font-medium">Annuler</button>
                             <button onClick={handleAddProject} className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium shadow-sm">Créer Projet</button>
                        </div>
                     </div>
                )}

                <div className="p-5 bg-slate-50/30 rounded-b-xl">
                    {filteredProjects.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <Briefcase size={48} className="opacity-20 mb-4" />
                            <p className="text-sm font-medium">Aucun projet pour ce client.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProjects.map(project => (
                                <div key={project.id} className="rounded-xl bg-white flex flex-col h-full group relative shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                                    <div className="p-5 flex flex-col h-full">
                                    {editingProjectId === project.id ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nom du projet</label>
                                                <input 
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    value={editProjectData.name || ''}
                                                    onChange={e => setEditProjectData({...editProjectData, name: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Description</label>
                                                <textarea 
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white resize-none text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    rows={2}
                                                    value={editProjectData.description || ''}
                                                    onChange={e => setEditProjectData({...editProjectData, description: e.target.value})}
                                                />
                                            </div>
                                            
                                            <TjmManager 
                                                tjms={editProjectData.specificTjms || {}} 
                                                onChange={(tjms) => setEditProjectData({...editProjectData, specificTjms: tjms})}
                                                placeholder="TJM spécifiques..."
                                            />
                                            
                                            <div className="flex justify-end gap-2 pt-2 mt-auto">
                                                <button onClick={() => setEditingProjectId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded bg-slate-100"><X size={16} /></button>
                                                <button onClick={handleUpdateProject} className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm"><Save size={16} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                                                        <LayoutTemplate size={16} />
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">{project.name}</h4>
                                                </div>
                                                <div className="flex gap-1 absolute top-5 right-5 bg-white pl-2 z-20">
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleStartEditProject(project); }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                                                        title="Modifier"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => handleDeleteProject(project.id, e)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed pl-8">{project.description || 'Pas de description'}</p>
                                            
                                            <div className="mt-auto pt-3 border-t border-slate-100">
                                                {project.specificTjms && Object.keys(project.specificTjms).length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        <div className="text-[10px] uppercase text-indigo-500 font-bold tracking-wide flex items-center gap-1">
                                                            <DollarSign size={10} /> Exceptions Tarifaires
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {Object.entries(project.specificTjms).map(([r, p]) => (
                                                                <span key={r} className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full text-indigo-700 font-medium">
                                                                    {r} <span className="font-bold">{p}€</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 italic bg-slate-50/50 p-1.5 rounded">
                                                        <Check size={12} className="text-emerald-500" /> Tarifs standards du client
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border-2 border-slate-200 border-dashed m-4 py-20">
            <Building size={64} className="mb-6 opacity-20 text-indigo-900" />
            <p className="text-lg font-medium text-slate-500">Sélectionnez un client</p>
            <p className="text-sm">pour gérer ses informations et ses projets</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
