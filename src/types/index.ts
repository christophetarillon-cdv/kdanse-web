export type { Cart, CartItem, CartTotals, RegistrationConfiguration } from './cart';

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

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  postalAddress?: {
    street: string;
    postalCode: string;
    city: string;
  };
  license?: {
    number: string;
    federation: 'ffdanse'; // extensible pour d'autres fédérations
    active: boolean;
  };
  photoUrl?: string; // Profile photo from app or uploaded
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  profile?: UserProfile;
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
  status: 'paid' | 'pending_confirmation' | 'pending_plan' | 'cancelled' | 'active' | 'completed';
  registrationDetails: {
    danceType: 'solo' | 'couple';
    dancers: { licensed: boolean }[];
    accompanists: number;
    wantHousing: boolean;
    housingSolo: number;
    housingCouple: number;
  };
  paymentMethod?: 'helloasso' | 'virement' | 'cheque' | 'plan';
  amount: number;
  paymentDate?: Date;
  chequeNumber?: string;
  chequeBank?: string;
  chequeCity?: string;
  chequeName?: string;
  paymentPlanId?: string;
  cartId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Saisie admin des détails d'un paiement (échéance ou paiement simple)
export interface PaymentDetailsDraft {
  amount: number;
  method: 'cheque' | 'virement' | 'cheque_vacances' | 'helloasso';
  date: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeCity?: string;
  chequeName?: string;
  chequeVacancesCount?: number;
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
  index?: number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'received' | 'cancelled';
  method: 'cheque' | 'virement' | 'cheque_vacances';
  chequeNumber?: string;
  chequeBank?: string;
  chequeCity?: string;
  chequeName?: string;
  chequeVacancesCount?: number;
  chequeVacancesSerialNumbers?: string[];
  receivedDate?: Date;
  confirmedBy?: string;
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
