
export enum QuoteStatus {
  DRAFT = 'DRAFT',
  ESTIMATE = 'ESTIMATE',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  LATE = 'LATE',
}

export interface Client {
  id: string;
  name: string;
  email: string;
  companyName: string;
  address: string;
  defaultTjms: Record<string, number>; // Map of Role Name -> Price
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  specificTjms?: Record<string, number>; // Override TJM per role for this project
}

export interface QuoteItem {
  id: string;
  description: string;
  details: Record<string, number>; // Map of Role -> Days (e.g., { "Dev": 2, "Design": 0.5 })
}

export interface QuoteSection {
  id: string;
  title: string;
  items: QuoteItem[];
}

export interface Quote {
  id: string;
  reference: string;
  version: number;
  clientId: string;
  projectId: string;
  status: QuoteStatus;
  sections: QuoteSection[]; // Changed from flat items to sections
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  totalAmount: number;
  notes?: string;
  hasVat: boolean; // Option to enable/disable VAT
}

export interface DashboardStats {
  totalRevenue: number;
  pendingAmount: number;
  acceptanceRate: number;
  activeClients: number;
}
