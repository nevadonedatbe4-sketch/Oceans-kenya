import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { NON_PUBLIC_STATUS_LIST } from '@/lib/publicListings';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { useCurrency } from '@/hooks/useCurrency';
import { formatLocation, formatAreaName, smartTitleCase } from '@/lib/location';
import { withReturnFrom } from '@/lib/navigation';
import EntityImage from '@/components/feature/EntityImage';

interface SimilarProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  area: string;
  price: string;
  image: string;
  beds: number;
  baths: number;
  parking: number;
  sqft: number;
  purpose: string;
  propertyType: string;
}

interface SimilarPropertiesProps {
  currentId: string;
  propertyType: string;
  purpose: string;
}

export default function SimilarProperties({ currentId, propertyType, purpose }: SimilarPropertiesProps) {
  const [properties, setProperties] = useState<SimilarProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrency();
  const { pathname, search } = useLocation();
  const currentPath = `${pathname}${search}`;

  useEffect(() => {
    async function fetchSimilar() {
      setLoading(true);
      try {
        let query = supabase
          .from('all_listings')
          .select('id,slug,title,location,address,neighbourhood,city,state_region,price,currency,main_image,images,bedrooms,bathrooms,parking,sqft,purpose,property_type')
          .neq('id', currentId)
          .neq('title', '')
          .eq('is_published', true)
          .not('status', 'in', NON_PUBLIC_STATUS_LIST)
          .order('created_at', { ascending: false })
          .limit(4);

        if (propertyType === 'land') {
          query = query.eq('property_category', 'land');
        } else {
          if (propertyType) {
            query = query.eq('property_type', propertyType);
          }
          if (purpose) {
            query = query.eq('purpose', purpose);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        const mapped = ((data || []) as Record<string, unknown>[]).map((row) => {
          const images = (row.images as string[] | null) || [];
          const mainImg = String(row.main_image || '');
          return {
            id: String(row.id),
            slug: String(row.slug || row.id),
            title: smartTitleCase(String(row.title || 'Untitled')),
            location: formatLocation({
              address: row.address as string | null,
              neighbourhood: row.neighbourhood as string | null,
              location: String(row.location || ''),
              city: row.city as string | null,
              state_region: row.state_region as string | null,
            }),
            area: formatAreaName({
              address: row.address as string | null,
              neighbourhood: row.neighbourhood as string | null,
              location: String(row.location || ''),
              city: row.city as string | null,
            }),
            price: format(Number(row.price || 0), String(row.currency || 'KES') as 'KES' | 'USD' | 'GBP' | 'EUR'),
            image: mainImg || images[0] || '',
            beds: Number(row.bedrooms ?? 0),
            baths: Number(row.bathrooms ?? 0),
            parking: Number(row.parking ?? 0),
            sqft: Number(row.sqft ?? 0),
            purpose: String(row.purpose || 'sale'),
            propertyType: String(row.property_type || ''),
          };
        });
        setProperties(mapped);
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSimilar();
  }, [currentId, propertyType, purpose, format]);

  if (loading) {
    return (
      <div className="bg-white border border-primary/12 rounded-[2px] p-5 md:p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-primary/12">
          <h2 className="font-roboto text-[13px] font-bold uppercase tracking-[0.1em] text-primary">Similar Properties</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-[180px] bg-stone-200 rounded-[2px] mb-3"></div>
              <div className="h-4 bg-stone-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-stone-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) return null;

  return (
    <div className="bg-white border border-primary/12 rounded-lg p-3.5 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-primary/12">
        <h2 className="font-roboto text-[13px] font-bold uppercase tracking-[0.1em] text-primary">Similar Properties</h2>
        <Link to="/all-properties" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-roboto font-semibold text-primary border border-primary/20 rounded-md hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap">
          View All <i className="ri-arrow-right-line text-xs"></i>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3.5">
        {properties.map((p) => (
          <Link
            key={p.id}
            to={withReturnFrom(`/property/${p.slug}`, currentPath)}
            className="group flex flex-col rounded-md border border-[#e5e5e5] overflow-hidden hover:border-primary/30 transition-colors"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F5]">
              <EntityImage
                src={p.image}
                alt={p.title}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex flex-col flex-1 p-2.5">
              <p className="text-[10px] font-roboto font-semibold uppercase tracking-wide text-[#888] mb-0.5 truncate">{p.propertyType || 'Property'}</p>
              <h3 className="text-[13px] font-roboto font-medium text-[color:var(--card-title-text)] leading-snug line-clamp-1 mb-1 group-hover:text-primary transition-colors">{p.title}</h3>
              <p className="text-[11px] font-roboto text-[color:var(--card-location-text)] mb-1.5 truncate">
                <i className="ri-map-pin-line text-[10px] mr-0.5"></i>{p.area}
              </p>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-roboto text-[color:var(--card-specs-text)] mb-2">
                {getPropertySpecs(p.propertyType, {
                  beds: p.beds,
                  baths: p.baths,
                  parking: p.parking,
                  sqft: p.sqft,
                }).map((spec) => (
                  <span key={spec.key} className="flex items-center gap-1 whitespace-nowrap">
                    <i className={`${spec.icon} text-[color:var(--card-specs-text)] text-[11px]`}></i>{spec.label}
                  </span>
                ))}
              </div>
              <p className="mt-auto text-sm font-roboto font-bold text-[color:var(--card-price-text)] leading-none whitespace-nowrap">{p.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}