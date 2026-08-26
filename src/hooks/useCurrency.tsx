import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

interface CurrencyInfo {
  code: CurrencyCode;
  label: string;
  symbol: string;
  enabled: boolean;
}

// All rates stored as: 1 KES = X foreign units
// KES is always 1 (the internal base)
interface ExchangeRates {
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

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  KES: 'KES',
  USD: '$',
  GBP: '£',
  EUR: '€',
  UGX: 'UGX',
  AED: 'AED',
  ZAR: 'R',
};

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  KES: 'Kenyan Shilling',
  USD: 'US Dollar',
  GBP: 'British Pound',
  EUR: 'Euro',
  UGX: 'Ugandan Shilling',
  AED: 'UAE Dirham',
  ZAR: 'South African Rand',
};

const DEFAULT_RATES: ExchangeRates = {
  KES: 1,
  USD: 0.0077,  // 1 KES = 0.0077 USD (≈ 1 USD = 130 KES)
  GBP: 0.0061,  // 1 KES = 0.0061 GBP (≈ 1 GBP = 165 KES)
  EUR: 0.0071,  // 1 KES = 0.0071 EUR (≈ 1 EUR = 140 KES)
  UGX: 0.0303,  // 1 KES = 0.0303 UGX (≈ 1 UGX = 33 KES... wait, UGX is weaker)
  AED: 0.0282,  // 1 KES = 0.0282 AED (≈ 1 AED = 35.4 KES)
  ZAR: 0.1449,  // 1 KES = 0.1449 ZAR (≈ 1 ZAR = 6.9 KES)
};

function buildFallbackRates(): ExchangeRates {
  return { ...DEFAULT_RATES };
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'KES',
  setCurrency: () => {},
  rates: DEFAULT_RATES,
  currencies: [],
  convert: (n) => n,
  format: (n) => `KES ${n.toLocaleString()}`,
  symbol: 'KES',
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem('oceans_currency');
    if (stored && ['KES', 'USD', 'GBP', 'EUR', 'UGX', 'AED', 'ZAR'].includes(stored)) {
      return stored as CurrencyCode;
    }
    return 'KES';
  });
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);

  const fetchRates = useCallback(async () => {
    const { data, error } = await supabase
      .from('currency_settings')
      .select('code, label, symbol, rate, enabled')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback: try old site_settings approach
      const { data: siteData } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['exchange_rate_usd', 'exchange_rate_gbp', 'exchange_rate_eur', 'currency_default']);
      
      const fallbackRates = buildFallbackRates();
      if (siteData && siteData.length > 0) {
        siteData.forEach((s) => {
          if (s.key === 'exchange_rate_usd' && s.value && parseFloat(s.value) > 0) {
            fallbackRates.USD = 1 / parseFloat(s.value);
          }
          if (s.key === 'exchange_rate_gbp' && s.value && parseFloat(s.value) > 0) {
            fallbackRates.GBP = 1 / parseFloat(s.value);
          }
          if (s.key === 'exchange_rate_eur' && s.value && parseFloat(s.value) > 0) {
            fallbackRates.EUR = 1 / parseFloat(s.value);
          }
        });
      }
      setRates(fallbackRates);
      
      // Build currencies list from fallback
      const fallbackCurrencies: CurrencyInfo[] = [
        { code: 'KES', label: CURRENCY_LABELS.KES, symbol: CURRENCY_SYMBOLS.KES, enabled: true },
        { code: 'USD', label: CURRENCY_LABELS.USD, symbol: CURRENCY_SYMBOLS.USD, enabled: true },
        { code: 'GBP', label: CURRENCY_LABELS.GBP, symbol: CURRENCY_SYMBOLS.GBP, enabled: true },
        { code: 'EUR', label: CURRENCY_LABELS.EUR, symbol: CURRENCY_SYMBOLS.EUR, enabled: true },
      ];
      setCurrencies(fallbackCurrencies);
      return;
    }

    // Build rates from currency_settings: DB stores 1 UNIT = X KES
    // We need 1 KES = X units -> rate = 1 / dbRate
    const newRates = buildFallbackRates();
    const enabledCurrencies: CurrencyInfo[] = [];

    data.forEach((row: { code: string; label: string; symbol: string; rate: number; enabled: boolean }) => {
      const code = row.code as CurrencyCode;
      if (code in newRates) {
        if (code !== 'KES' && row.rate > 0) {
          newRates[code] = 1 / row.rate;
        }
        if (row.enabled) {
          enabledCurrencies.push({
            code,
            label: row.label || CURRENCY_LABELS[code] || code,
            symbol: row.symbol || CURRENCY_SYMBOLS[code] || code,
            enabled: true,
          });
        }
      }
    });

    setRates(newRates);
    setCurrencies(enabledCurrencies);
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem('oceans_currency', c);
  };

  const convert = useCallback((amount: number, fromCurrency: CurrencyCode = 'KES'): number => {
    if (!amount || amount <= 0) return amount;
    if (fromCurrency === currency) return amount;
    // Convert from source to KES first, then to target
    const kesAmount = fromCurrency === 'KES' ? amount : amount / rates[fromCurrency];
    return Math.round(kesAmount * rates[currency]);
  }, [currency, rates]);

  const format = useCallback((amount: number, fromCurrency: CurrencyCode = 'KES'): string => {
    const converted = convert(amount, fromCurrency);
    const sym = CURRENCY_SYMBOLS[currency];
    return `${sym} ${converted.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }, [convert, currency]);

  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, currencies, convert, format, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}