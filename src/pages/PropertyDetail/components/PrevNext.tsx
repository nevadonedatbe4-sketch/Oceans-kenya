import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface NavProperty {
  slug: string;
  title: string;
  location: string;
  price: string;
  image: string;
}

interface PrevNextProps {
  currentId: string;
  currentCreatedAt?: string;
}

function formatPrice(row: Record<string, unknown>): string {
  const priceNum = Number(row.price || 0);
  const currency = String(row.currency || 'KES');
  const symbol = currency === 'USD' ? '$' : currency === 'KES' ? 'KSh' : currency === 'UGX' ? 'UGX' : currency === 'GBP' ? '£' : '€';
  if (priceNum >= 1_000_000_000) return `${symbol} ${(priceNum / 1_000_000_000).toFixed(1)}B`;
  if (priceNum >= 1_000_000) return `${symbol} ${(priceNum / 1_000_000).toFixed(1)}M`;
  if (priceNum >= 1_000) return `${symbol} ${(priceNum / 1_000).toFixed(0)}K`;
  return `${symbol} ${priceNum.toLocaleString()}`;
}

export default function PropertyPrevNext({ currentId, currentCreatedAt }: PrevNextProps) {
  const [prevProp, setPrevProp] = useState<NavProperty | null>(null);
  const [nextProp, setNextProp] = useState<NavProperty | null>(null);

  useEffect(() => {
    async function fetchNav() {
      if (!currentCreatedAt) return;
      try {
        // Previous: created_at < current, order desc, take 1
        const { data: prevData } = await supabase
          .from('listings')
          .select('slug,title,location,price,currency,main_image')
          .lt('created_at', currentCreatedAt)
          .eq('is_published', true)
          .neq('title', '')
          .gt('price', 0)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevData) {
          const row = prevData as Record<string, unknown>;
          setPrevProp({
            slug: String(row.slug || ''),
            title: String(row.title || ''),
            location: String(row.location || ''),
            price: formatPrice(row),
            image: String(row.main_image || ''),
          });
        }

        // Next: created_at > current, order asc, take 1
        const { data: nextData } = await supabase
          .from('listings')
          .select('slug,title,location,price,currency,main_image')
          .gt('created_at', currentCreatedAt)
          .eq('is_published', true)
          .neq('title', '')
          .gt('price', 0)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextData) {
          const row = nextData as Record<string, unknown>;
          setNextProp({
            slug: String(row.slug || ''),
            title: String(row.title || ''),
            location: String(row.location || ''),
            price: formatPrice(row),
            image: String(row.main_image || ''),
          });
        }
      } catch {
        // silently fail
      }
    }
    fetchNav();
  }, [currentId, currentCreatedAt]);

  if (!prevProp && !nextProp) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-[2px] overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
        {/* Previous */}
        {prevProp ? (
          <Link to={`/property/${prevProp.slug}`} className="flex items-center gap-3 p-4 md:p-5 group hover:bg-stone-50 transition-colors cursor-pointer">
            <div className="w-16 h-12 overflow-hidden rounded-[2px] shrink-0 bg-stone-100">
              {prevProp.image ? (
                <img src={prevProp.image} alt={prevProp.title} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-building-line text-stone-300 text-lg"></i>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <i className="ri-arrow-left-s-line"></i>Previous Property
              </p>
              <p className="text-primary font-roboto text-xs font-semibold truncate group-hover:text-golden transition-colors">{prevProp.title}</p>
              <p className="text-stone-400 font-roboto text-[10px] truncate">{prevProp.location}</p>
              <p className="text-golden font-roboto text-xs font-semibold">{prevProp.price}</p>
            </div>
          </Link>
        ) : (
          <div className="p-4 md:p-5 text-stone-300 font-roboto text-xs">No previous property</div>
        )}

        {/* Next */}
        {nextProp ? (
          <Link to={`/property/${nextProp.slug}`} className="flex items-center gap-3 p-4 md:p-5 group hover:bg-stone-50 transition-colors cursor-pointer flex-row-reverse text-right">
            <div className="w-16 h-12 overflow-hidden rounded-[2px] shrink-0 bg-stone-100">
              {nextProp.image ? (
                <img src={nextProp.image} alt={nextProp.title} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-building-line text-stone-300 text-lg"></i>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1 justify-end">
                Next Property<i className="ri-arrow-right-s-line"></i>
              </p>
              <p className="text-primary font-roboto text-xs font-semibold truncate group-hover:text-golden transition-colors">{nextProp.title}</p>
              <p className="text-stone-400 font-roboto text-[10px] truncate">{nextProp.location}</p>
              <p className="text-golden font-roboto text-xs font-semibold">{nextProp.price}</p>
            </div>
          </Link>
        ) : (
          <div className="p-4 md:p-5 text-stone-300 font-roboto text-xs text-right">No next property</div>
        )}
      </div>
    </div>
  );
}