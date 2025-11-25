import { supabase, isSupabaseEnabled } from './supabaseClient';
import { Client, Project, Quote, QuoteStatus, QuoteSection, QuoteItem } from '../types';

const CLIENTS_KEY = 'devispro_clients';
const PROJECTS_KEY = 'devispro_projects';
const QUOTES_KEY = 'devispro_quotes';

// Default roles for local fallback seeding
const DEFAULT_ROLES = {
  "UX/UI": 720,
  "Dev": 880,
  "Data analyst": 880,
  "CDP senior": 720,
  "CDP Junior": 650,
  "Directeur de projet": 920,
  "Directeur technique": 1400,
  "Directeur de production": 1050,
  "SRE": 1050
};

// ---------------------------
// Helpers: localStorage fallback
// ---------------------------
const readArray = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Unable to read data from localStorage key:', key, e);
    return [];
  }
};

const seedLocalData = () => {
  const hasClients = localStorage.getItem(CLIENTS_KEY) !== null;
  const hasProjects = localStorage.getItem(PROJECTS_KEY) !== null;
  const hasQuotes = localStorage.getItem(QUOTES_KEY) !== null;

  if (!hasClients) {
    const clients: Client[] = [
      { 
          id: 'c1', 
          name: 'Alice Dupont', 
          companyName: 'Toyota Financial Services', 
          email: 'alice@tfs.com', 
          address: '123 Avenue de la Grande Armée, Paris', 
          defaultTjms: { ...DEFAULT_ROLES } 
      },
      { 
          id: 'c2', 
          name: 'Bob Martin', 
          companyName: 'GreenEnergy', 
          email: 'bob@green.com', 
          address: '456 Eco Blvd, Lyon', 
          defaultTjms: { ...DEFAULT_ROLES }
      },
    ];
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  }

  if (!hasProjects) {
    const projects: Project[] = [
      { 
          id: 'p1', 
          clientId: 'c1', 
          name: 'Évolutions graphiques espace public', 
          specificTjms: { "Full stack developer": 850 } 
      },
      { id: 'p2', clientId: 'c1', name: 'Maintenance Annuelle' },
      { id: 'p3', clientId: 'c2', name: 'Dashboard IoT' },
    ];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  if (!hasQuotes) {
    const quotes: Quote[] = [
      {
        id: 'q1',
        reference: 'DEV-2023-001',
        version: 1,
        clientId: 'c1',
        projectId: 'p1',
        status: QuoteStatus.ACCEPTED,
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        validUntil: new Date(Date.now() + 86400000 * 20).toISOString(),
        hasVat: false,
        sections: [
          {
            id: 's1',
            title: '1 - PROJECT MANAGEMENT & CONCEPTION',
            items: [
              { id: 'i1', description: 'Conception, pilotage', details: { 'Directeur projet': 1, 'Chef de projet': 2 } }
            ]
          },
          {
            id: 's2',
            title: '2 - DEVELOPPEMENT',
            items: [
              { id: 'i2', description: 'Déblocage FAQ + tests responsive', details: { 'Directeur projet': 0.1, 'Chef de projet': 0.25, 'Full stack developer': 0.55 } },
              { id: 'i3', description: 'Blog - simple', details: { 'Directeur projet': 0.1, 'Chef de projet': 1, 'Full stack developer': 4.4 } }
            ]
          }
        ],
        totalAmount: 7640,
      }
    ];
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
  }
};

if (!isSupabaseEnabled) {
  seedLocalData();
}

const localService = {
  async getClients(): Promise<Client[]> {
    return readArray<Client>(CLIENTS_KEY);
  },
  async saveClients(clients: Client[]) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },
  async deleteClient(id: string) {
    const clients = await this.getClients();
    const filteredClients = clients.filter(c => String(c.id) !== String(id));
    await this.saveClients(filteredClients);

    const projects = await this.getProjects();
    const projectsToDelete = projects.filter(p => String(p.clientId) === String(id));
    const remainingProjects = projects.filter(p => String(p.clientId) !== String(id));
    await this.saveProjects(remainingProjects);

    const projectIdsToDelete = new Set(projectsToDelete.map(p => String(p.id)));
    const quotes = await this.getQuotes();
    const remainingQuotes = quotes.filter(q => String(q.clientId) !== String(id) && !projectIdsToDelete.has(String(q.projectId)));
    await this.saveQuotes(remainingQuotes);
  },
  async getProjects(): Promise<Project[]> {
    return readArray<Project>(PROJECTS_KEY);
  },
  async saveProjects(projects: Project[]) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },
  async deleteProject(id: string) {
    const projects = await this.getProjects();
    const remainingProjects = projects.filter(p => String(p.id) !== String(id));
    await this.saveProjects(remainingProjects);

    const quotes = await this.getQuotes();
    const remainingQuotes = quotes.filter(q => String(q.projectId) !== String(id));
    await this.saveQuotes(remainingQuotes);
  },
  async getQuotes(): Promise<Quote[]> {
    return readArray<Quote>(QUOTES_KEY);
  },
  async saveQuotes(quotes: Quote[]) {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
  },
  async saveQuote(quote: Quote) {
    const quotes = await this.getQuotes();
    const index = quotes.findIndex(q => q.id === quote.id);
    if (index >= 0) {
      quotes[index] = quote;
    } else {
      quotes.push(quote);
    }
    await this.saveQuotes(quotes);
  },
  async deleteQuote(id: string) {
    const quotes = await this.getQuotes();
    const remainingQuotes = quotes.filter(q => String(q.id) !== String(id));
    await this.saveQuotes(remainingQuotes);
  }
};

// ---------------------------
// Helpers: Supabase mapping
// ---------------------------
const toDbClient = (c: Client, ownerId: string) => ({
  id: c.id,
  owner_id: ownerId,
  name: c.name,
  email: c.email || '',
  company_name: c.companyName,
  address: c.address || '',
  default_tjms: c.defaultTjms || {}
});

const fromDbClient = (row: any): Client => ({
  id: row.id,
  name: row.name || '',
  email: row.email || '',
  companyName: row.company_name || '',
  address: row.address || '',
  defaultTjms: row.default_tjms || {}
});

const toDbProject = (p: Project, ownerId: string) => ({
  id: p.id,
  owner_id: ownerId,
  client_id: p.clientId,
  name: p.name,
  description: p.description || '',
  specific_tjms: p.specificTjms || {}
});

const fromDbProject = (row: any): Project => ({
  id: row.id,
  clientId: row.client_id,
  name: row.name,
  description: row.description || '',
  specificTjms: row.specific_tjms || {}
});

const toDbQuote = (q: Quote, ownerId: string) => ({
  id: q.id,
  owner_id: ownerId,
  reference: q.reference,
  version: q.version,
  client_id: q.clientId,
  project_id: q.projectId,
  status: q.status,
  created_at: q.createdAt,
  updated_at: q.updatedAt,
  valid_until: q.validUntil,
  total_amount: q.totalAmount,
  notes: q.notes || '',
  has_vat: q.hasVat
});

const fromDbQuote = (row: any): Quote => ({
  id: row.id,
  reference: row.reference,
  version: row.version,
  clientId: row.client_id,
  projectId: row.project_id,
  status: row.status as QuoteStatus,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  validUntil: row.valid_until,
  totalAmount: Number(row.total_amount || 0),
  notes: row.notes || '',
  hasVat: Boolean(row.has_vat),
  sections: (row.quote_sections || [])
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((section: any) => ({
      id: section.id,
      title: section.title,
      items: (section.quote_items || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        details: item.details || {}
      })) as QuoteItem[]
    })) as QuoteSection[]
});

// ---------------------------
// Supabase-backed implementation
// ---------------------------
const supabaseService = {
  async requireUserId() {
    const { data, error } = await supabase!.auth.getUser();
    if (error || !data.user) {
      throw new Error('Utilisateur non authentifié');
    }
    return data.user.id;
  },

  async getClients(): Promise<Client[]> {
    const userId = await this.requireUserId();
    const { data, error } = await supabase!
      .from('clients')
      .select('*')
      .eq('owner_id', userId)
      .order('company_name', { ascending: true });
    if (error) throw error;
    return (data || []).map(fromDbClient);
  },

  async saveClients(clients: Client[]) {
    const userId = await this.requireUserId();
    const payload = clients.map(c => toDbClient(c, userId));
    const { error } = await supabase!.from('clients').upsert(payload);
    if (error) throw error;
  },

  async deleteClient(id: string) {
    const userId = await this.requireUserId();
    const { error } = await supabase!.from('clients').delete().eq('id', id).eq('owner_id', userId);
    if (error) throw error;
  },

  async getProjects(): Promise<Project[]> {
    const userId = await this.requireUserId();
    const { data, error } = await supabase!
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(fromDbProject);
  },

  async saveProjects(projects: Project[]) {
    const userId = await this.requireUserId();
    const payload = projects.map(p => toDbProject(p, userId));
    const { error } = await supabase!.from('projects').upsert(payload);
    if (error) throw error;
  },

  async deleteProject(id: string) {
    const userId = await this.requireUserId();
    const { error } = await supabase!.from('projects').delete().eq('id', id).eq('owner_id', userId);
    if (error) throw error;
  },

  async getQuotes(): Promise<Quote[]> {
    const userId = await this.requireUserId();
    const { data, error } = await supabase!
      .from('quotes')
      .select('*, quote_sections(*, quote_items(*))')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDbQuote);
  },

  async saveQuotes(quotes: Quote[]) {
    for (const quote of quotes) {
      await this.saveQuote(quote);
    }
  },

  async saveQuote(quote: Quote) {
    const userId = await this.requireUserId();
    const updatedAt = new Date().toISOString();
    const baseQuote = toDbQuote({ ...quote, updatedAt }, userId);

    const { error: baseErr } = await supabase!.from('quotes').upsert(baseQuote);
    if (baseErr) throw baseErr;

    // Clear existing sections/items to simplify upsert logic
    const { error: deleteErr } = await supabase!.from('quote_sections').delete().eq('quote_id', quote.id);
    if (deleteErr) throw deleteErr;

    if (quote.sections.length) {
      const sectionsPayload = quote.sections.map((section, index) => ({
          id: section.id,
        quote_id: quote.id,
        title: section.title,
        position: index
      }));

      const { error: sectionErr } = await supabase!.from('quote_sections').insert(sectionsPayload);
      if (sectionErr) throw sectionErr;

      const itemsPayload = quote.sections.flatMap(section => 
        section.items.map(item => ({
          id: item.id,
          section_id: section.id,
          description: item.description,
          details: item.details || {}
        }))
      );

      if (itemsPayload.length) {
        const { error: itemsErr } = await supabase!.from('quote_items').insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }
    }

    return { ...quote, updatedAt };
  },

  async deleteQuote(id: string) {
    const userId = await this.requireUserId();
    const { error } = await supabase!.from('quotes').delete().eq('id', id).eq('owner_id', userId);
    if (error) throw error;
  }
};

// ---------------------------
// Exported service facade
// ---------------------------
export const StorageService = {
  isRemote: isSupabaseEnabled,

  async getClients() {
    return isSupabaseEnabled ? supabaseService.getClients() : localService.getClients();
  },
  async saveClients(clients: Client[]) {
    return isSupabaseEnabled ? supabaseService.saveClients(clients) : localService.saveClients(clients);
  },
  async deleteClient(id: string) {
    return isSupabaseEnabled ? supabaseService.deleteClient(id) : localService.deleteClient(id);
  },

  async getProjects() {
    return isSupabaseEnabled ? supabaseService.getProjects() : localService.getProjects();
  },
  async saveProjects(projects: Project[]) {
    return isSupabaseEnabled ? supabaseService.saveProjects(projects) : localService.saveProjects(projects);
  },
  async deleteProject(id: string) {
    return isSupabaseEnabled ? supabaseService.deleteProject(id) : localService.deleteProject(id);
  },

  async getQuotes() {
    return isSupabaseEnabled ? supabaseService.getQuotes() : localService.getQuotes();
  },
  async saveQuotes(quotes: Quote[]) {
    return isSupabaseEnabled ? supabaseService.saveQuotes(quotes) : localService.saveQuotes(quotes);
  },
  async saveQuote(quote: Quote) {
    return isSupabaseEnabled ? supabaseService.saveQuote(quote) : localService.saveQuote(quote);
  },
  async deleteQuote(id: string) {
    return isSupabaseEnabled ? supabaseService.deleteQuote(id) : localService.deleteQuote(id);
  }
};
