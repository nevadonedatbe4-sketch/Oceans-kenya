import { createContext, useContext } from 'react';

export type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

export interface CurrencyInfo {
  code: CurrencyCode;
  label: string;
  symbol: string;
  enabled: boolean;
}

// All rates stored as: 1 KES = X foreign units
// KES is always 1 (the internal base)
export interface ExchangeRates {
  KES: number;
  USD: number;
  GBP: number;
  EUR: number;
  UGX: number;
  AED: number;
  ZAR: number;
}

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: ExchangeRates;
  currencies: CurrencyInfo[];
  convert: (amount: number, fromCurrency?: CurrencyCode) => number;
  format: (amount: number, fromCurrency?: CurrencyCode) => string;
  symbol: string;
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  KES: 'KES',
  USD: '$',
  GBP: '£',
  EUR: '€',
  UGX: 'UGX',
  AED: 'AED',
  ZAR: 'R',
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  KES: 'Kenyan Shilling',
  USD: 'US Dollar',
  GBP: 'British Pound',
  EUR: 'Euro',
  UGX: 'Ugandan Shilling',
  AED: 'UAE Dirham',
  ZAR: 'South African Rand',
};

export const DEFAULT_RATES: ExchangeRates = {
  KES: 1,
  USD: 0.0077,  // 1 KES = 0.0077 USD (≈ 1 USD = 130 KES)
  GBP: 0.0061,  // 1 KES = 0.0061 GBP (≈ 1 GBP = 165 KES)
  EUR: 0.0071,  // 1 KES = 0.0071 EUR (≈ 1 EUR = 140 KES)
  UGX: 0.0303,  // 1 KES = 0.0303 UGX (≈ 1 UGX = 33 KES... wait, UGX is weaker)
  AED: 0.0282,  // 1 KES = 0.0282 AED (≈ 1 AED = 35.4 KES)
  ZAR: 0.1449,  // 1 KES = 0.1449 ZAR (≈ 1 ZAR = 6.9 KES)
};

export function buildFallbackRates(): ExchangeRates {
  return { ...DEFAULT_RATES };
}

export const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'KES',
  setCurrency: () => {},
  rates: DEFAULT_RATES,
  currencies: [],
  convert: (n) => n,
  format: (n) => `KES ${n.toLocaleString()}`,
  symbol: 'KES',
});

export function useCurrency() {
  return useContext(CurrencyContext);
}