// ---- Wallet ----
export interface Wallet {
  id?        : string;
  balance    : number;
  updated_at?: string;
}

export interface UpdateWalletInput {
  balance: number;
}

// ---- Period selector ----
export type Period = '1w' | '1m' | '1y';

export interface PeriodOption {
  value : Period;
  label : string;
  months: number; // meses a solicitar ao backend
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '1w', label: '1 Sem', months: 1  },
  { value: '1m', label: '1 Mês', months: 1  },
  { value: '1y', label: '1 Ano', months: 12 },
];
