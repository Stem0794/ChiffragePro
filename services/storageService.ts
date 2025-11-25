
import { Client, Project, Quote, QuoteStatus } from '../types';

// Safely read an array from localStorage, returning [] on any issue
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

const CLIENTS_KEY = 'devispro_clients';
const PROJECTS_KEY = 'devispro_projects';
const QUOTES_KEY = 'devispro_quotes';

// Default roles based on user request
const DEFAULT_ROLES = {
    "Directeur général": 1050,
    "Directeur projet": 880,
    "Chef de projet senior": 680,
    "Chef de projet": 600,
    "UX designer": 720,
    "UI designer": 650,
    "Data Analyst": 720,
    "Directeur technique": 1050,
    "SRE": 920,
    "Full stack developer": 800
};

// Seed data if empty
const seedData = () => {
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
          defaultTjms: { 
              "Chef de projet": 550,
              "Full stack developer": 650,
              "UX designer": 600
          } 
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
        hasVat: true,
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

seedData();

export const StorageService = {
  getClients: (): Client[] => readArray<Client>(CLIENTS_KEY),
  saveClients: (clients: Client[]) => localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients)),
  
  deleteClient: (id: string) => {
      // 1. Delete Client
      const clients = StorageService.getClients().filter(c => String(c.id) !== String(id));
      StorageService.saveClients(clients);

      // 2. Cascade Delete Projects
      const projects = StorageService.getProjects();
      const projectsToDelete = projects.filter(p => String(p.clientId) === String(id));
      const remainingProjects = projects.filter(p => String(p.clientId) !== String(id));
      StorageService.saveProjects(remainingProjects);

      // 3. Cascade Delete Quotes
      const projectIdsToDelete = new Set(projectsToDelete.map(p => String(p.id)));
      const quotes = StorageService.getQuotes();
      const remainingQuotes = quotes.filter(q => String(q.clientId) !== String(id) && !projectIdsToDelete.has(String(q.projectId)));
      StorageService.saveQuotes(remainingQuotes);
  },

  getProjects: (): Project[] => readArray<Project>(PROJECTS_KEY),
  saveProjects: (projects: Project[]) => localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)),
  
  deleteProject: (id: string) => {
      // 1. Delete Project
      const projects = StorageService.getProjects().filter(p => String(p.id) !== String(id));
      StorageService.saveProjects(projects);

      // 2. Cascade Delete Quotes
      const quotes = StorageService.getQuotes().filter(q => String(q.projectId) !== String(id));
      StorageService.saveQuotes(quotes);
  },

  getQuotes: (): Quote[] => readArray<Quote>(QUOTES_KEY),
  saveQuotes: (quotes: Quote[]) => localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes)),

  saveQuote: (quote: Quote) => {
    const quotes = StorageService.getQuotes();
    const index = quotes.findIndex(q => q.id === quote.id);
    if (index >= 0) {
      quotes[index] = quote;
    } else {
      quotes.push(quote);
    }
    StorageService.saveQuotes(quotes);
  },
  
  deleteQuote: (id: string) => {
      const quotes = StorageService.getQuotes().filter(q => String(q.id) !== String(id));
      StorageService.saveQuotes(quotes);
  }
};
