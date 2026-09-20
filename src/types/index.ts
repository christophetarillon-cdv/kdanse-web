// User & Auth
export type UserRole = 'admin' | 'prof' | 'animateur' | 'user';

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

// Permissions
export interface PagePermissions {
  [key: string]: string[];
}

export interface AppSettings {
  pagePermissions: PagePermissions;
}

// Stage (inscription avec hébergement optionnel)
export interface Stage {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  pricing: StagePricing;
  createdAt: Date;
  updatedAt: Date;
}

export interface StagePricing {
  solo: number;
  couple: number;
  ffdanse: number;
  withHousing: number;
}

// Membership (inscription à un stage)
export interface Membership {
  id: string;
  userId: string;
  visibleUserIds: string[];
  stageId: string;
  status: 'active' | 'cancelled' | 'completed';
  options: {
    housing: boolean;
    pricingCategory: 'solo' | 'couple' | 'ffdanse';
  };
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Payment group (paiements groupés ou échelonnés)
export interface PaymentGroup {
  id: string;
  membershipIds: string[];
  visibleUserIds: string[];
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Payment installment (échéancier, chèques, virements)
export interface PaymentInstallment {
  id: string;
  paymentGroupId: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'cancelled';
  method: 'cheque' | 'virement' | 'helloasso';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// Bank account (nécessaire pour comptabilité)
export interface BankAccount {
  id: string;
  name: string;
  iban: string;
  createdAt: Date;
  updatedAt: Date;
}
