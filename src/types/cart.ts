export interface Dancer {
  licensed: boolean;
}

export interface RegistrationConfiguration {
  danceType: 'solo' | 'couple';
  dancers: Dancer[];
  accompanists: number;
  wantHousing: boolean;
  housingSolo: number;
  housingCouple: number;
}

export interface CartItem {
  id: string; // unique id for item in cart
  stageId: string;
  stageName: string;
  configuration: RegistrationConfiguration;
  stagePrices: {
    soloLicensed: number;
    soloUnlicensed: number;
    coupleUnlicensed: number;
    coupleLicensed: number;
    coupleMixed: number;
  };
  housingPrices: {
    solo: number;
    couple: number;
  };
  quantity: number;
}

export interface CartTotals {
  stageTotal: number;
  housingTotal: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Cart {
  id: string;
  userId: string;
  status: 'pending' | 'submitted' | 'paid' | 'cancelled';
  items: CartItem[];
  totals: CartTotals;
  appliedCoupon: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
