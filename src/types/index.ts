// Season (Saisons - exemple: 2024-2025)
export interface Season {
  id: string;
  name: string; // "2024-2025"
  description?: string;
  startDate: Date;
  endDate: Date;
  reservationStartDate: Date;
  reservationEndDate: Date;
  status: 'planning' | 'active' | 'closed' | 'reservation';
  stageIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Reservation (Réservations pour la saison suivante)
export interface Reservation {
  id: string;
  userId: string;
  seasonId: string; // Saison pour laquelle on réserve
  currentSeasonId: string; // Saison actuelle (preuve d'inscription)
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  seasonId?: string; // Reference to Season
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
  visibleUserIds?: string[];
  stageId: string;
  stageName: string;
  status: 'paid' | 'pending_confirmation' | 'cancelled' | 'active' | 'completed';
  registrationDetails: {
    danceType: 'solo' | 'couple';
    dancers: { licensed: boolean }[];
    accompanists: number;
    wantHousing: boolean;
    housingSolo: number;
    housingCouple: number;
  };
  paymentMethod?: 'helloasso' | 'virement' | 'cheque';
  amount: number;
  cartId?: string;
  createdAt: Date;
  updatedAt?: Date;
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
  bic?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment plan settings (coordonnées Kdanse)
export interface PaymentSettings {
  id: string;
  bankAccount?: {
    iban: string;
    bic: string;
    accountName: string;
  };
  postalAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  updatedAt: Date;
}

// Payment installment (échéance individuelle)
export interface PaymentInstallment {
  id: string;
  paymentPlanId: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'received' | 'cancelled';
  method: 'cheque' | 'virement' | 'cheque_vacances';
  // Pour chèques
  chequeNumber?: string;
  chequeBank?: string;
  chequeCity?: string;
  chequeName?: string; // Nom sur le chèque si différent
  // Pour chèques vacances
  chequeVacancesCount?: number; // Nombre de chèques vacances
  chequeVacancesSerialNumbers?: string[]; // Numéros de série
  // Admin validation
  receivedDate?: Date;
  confirmedBy?: string; // userId de l'admin
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Payment plan (ensemble des échéances)
export interface PaymentPlan {
  id: string;
  cartId: string;
  userId: string;
  membershipIds?: string[];
  totalAmount: number;
  installmentCount: number; // 3 ou 4
  installments: PaymentInstallment[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  acceptedTerms: boolean;
  createdAt: Date;
  updatedAt: Date;
}
