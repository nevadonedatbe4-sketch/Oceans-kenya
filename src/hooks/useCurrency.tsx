import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type Currency = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX';

interface ExchangeRates {
  KES: number; // base
  USD: number;
  GBP: number;
  EUR: number;
  UGX: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: ExchangeRates;
  convert: (amount: number, fromCurrency?: Currency) => number;
  format: (amount: number, fromCurrency?: Currency) => string;
  symbol: string;
}

const DEFAULT_RATES: ExchangeRates = {
  KES: 1,
  USD: 0.0077,   // 1 KES = 0.0077 USD
  GBP: 0.0061,   // 1 KES = 0.0061 GBP
  EUR: 0.0071,   // 1 KES = 0.0071 EUR
  UGX: 28.5,     // 1 KES = 28.5 UGX
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KES: 'KSh',
  USD: '$',
  GBP: '£',
  EUR: '€',
  UGX: 'UGX',
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'KES',
  setCurrency: () => {},
  rates: DEFAULT_RATES,
  convert: (n) => n,
  format: (n) => `KSh ${n.toLocaleString()}`,
  symbol: 'KSh',
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem('oceans_currency') as Currency) || 'KES';
  });
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);

  const fetchRates = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['exchange_rate_usd', 'exchange_rate_gbp', 'exchange_rate_eur', 'exchange_rate_ugx']);
    if (data && data.length > 0) {
      const newRates = { ...DEFAULT_RATES };
      data.forEach((s) => {
        if (s.key === 'exchange_rate_usd' && s.value) newRates.USD = 1 / parseFloat(s.value);
        if (s.key === 'exchange_rate_gbp' && s.value) newRates.GBP = 1 / parseFloat(s.value);
        if (s.key === 'exchange_rate_eur' && s.value) newRates.EUR = 1 / parseFloat(s.value);
        if (s.key === 'exchange_rate_ugx' && s.value) newRates.UGX = parseFloat(s.value);
      });
      setRates(newRates);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('oceans_currency', c);
  };

  const convert = useCallback((amount: number, fromCurrency: Currency = 'KES') => {
    if (fromCurrency === currency) return amount;
    // Convert from source currency to KES first, then to target
    const kesAmount = fromCurrency === 'KES' ? amount : amount / rates[fromCurrency];
    return kesAmount * rates[currency];
  }, [currency, rates]);

  const format = useCallback((amount: number, fromCurrency: Currency = 'KES') => {
    const converted = convert(amount, fromCurrency);
    const sym = CURRENCY_SYMBOLS[currency];
    if (converted >= 1_000_000_000) return `${sym} ${(converted / 1_000_000_000).toFixed(1)}B`;
    if (converted >= 1_000_000) return `${sym} ${(converted / 1_000_000).toFixed(1)}M`;
    if (converted >= 1_000) return `${sym} ${(converted / 1_000).toFixed(0)}K`;
    return `${sym} ${Math.round(converted).toLocaleString()}`;
  }, [convert, currency]);

  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}