import { convertCurrency, formatMoneyIn } from '@/lib/fxRates';

interface BudgetCeilingHintProps {
  /** The listing price as stored (null = price on request). */
  price: number | null;
  /** The currency the stored price is in. */
  fromCurrency: string | null | undefined;
  /** The client's chosen currency — everything is shown converted into it. */
  currency: string | null | undefined;
  /** The client's maximum budget, in `currency`. Null/0 = no ceiling set. */
  budgetMax: number | null | undefined;
  /** Live KES-based exchange rates. */
  rates: Record<string, number>;
  /** Slightly denser presentation for table cells. */
  compact?: boolean;
}

/**
 * "Budget ceiling" hint — makes it obvious WHY a property is in (or out of) a
 * client's match list: the price is compared against the client's maximum
 * budget, in one uniform currency, with a simple fill bar. Over-ceiling reads
 * red, within-ceiling reads green, and a missing price stays neutral.
 */
export default function BudgetCeilingHint({
  price,
  fromCurrency,
  currency,
  budgetMax,
  rates,
  compact = false,
}: BudgetCeilingHintProps) {
  if (budgetMax == null || budgetMax <= 0) return null;

  const ceiling = formatMoneyIn(budgetMax, currency, rates);
  const converted = price != null && price > 0
    ? convertCurrency(price, fromCurrency, currency, rates)
    : null;

  const over = converted != null && converted > budgetMax;
  const pct = converted != null ? Math.min(100, Math.round((converted / budgetMax) * 100)) : 0;
  const belowPct = converted != null && !over
    ? Math.round(((budgetMax - converted) / budgetMax) * 100)
    : 0;

  const tone = converted == null
    ? { text: 'text-stone-500', bar: 'bg-stone-300', icon: 'ri-price-tag-3-line' }
    : over
      ? { text: 'text-red-600', bar: 'bg-red-400', icon: 'ri-arrow-up-line' }
      : { text: 'text-emerald-700', bar: 'bg-emerald-500', icon: 'ri-check-line' };

  const headline = converted == null
    ? 'Price on request'
    : over
      ? 'Above the budget ceiling — excluded when budget is mandatory'
      : `Within the budget ceiling${belowPct > 0 ? ` · ${belowPct}% under` : ''}`;

  const right = converted != null
    ? `${formatMoneyIn(converted, currency, rates)} of ${ceiling}`
    : `Ceiling ${ceiling}`;

  return (
    <div className={`rounded-md border border-stone-100 bg-stone-50/70 px-2.5 ${compact ? 'py-1.5' : 'py-2'}`}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-1 font-medium ${tone.text}`}>
          <i className={tone.icon} />
          {headline}
        </span>
        <span className="text-stone-400 whitespace-nowrap">{right}</span>
      </div>
      {converted != null && (
        <div className="mt-1.5 h-1.5 rounded-full bg-stone-200/70 overflow-hidden">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
      )}
    </div>
  );
}