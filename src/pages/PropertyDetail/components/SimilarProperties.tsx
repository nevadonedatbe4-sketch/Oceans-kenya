import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { useCurrency } from '@/hooks/useCurrency';
import { formatLocation, formatAreaName, smartTitleCase } from '@/lib/location';

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

  useEffect(() => {
    async function fetchSimilar() {
      setLoading(true);
      try {
        let query = supabase
          .from('listings')
          .select('id,slug,title,location,address,neighbourhood,city,state_region,price,currency,main_image,images,bedrooms,bathrooms,parking,sqft,purpose,property_type')
          .eq('is_published', true)
          .neq('id', currentId)
          .neq('title', '')
          .gt('price', 0)
          .in('status', ['available', 'under_contract'])
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
          const fallback = 'https://readdy.ai/api/search-image?query=Modern%20luxury%20property%20exterior%20clean%20white%20walls%20large%20windows%20bright%20daylight%20architectural%20photography%20high%20quality&width=800&height=600&seq=similar-fallback&orientation=landscape';
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
            image: mainImg || (images.length > 0 ? images[0] : fallback),
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
          <h2 className="font-roboto text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Similar Properties</h2>
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
    <div className="bg-white border border-primary/12 rounded-[2px] p-5 md:p-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-primary/12">
        <h2 className="font-roboto text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Similar Properties</h2>
        <Link to="/all-properties" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-roboto font-medium text-primary border border-primary/20 rounded-sm hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap">
          View All <i className="ri-arrow-right-line"></i>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {properties.map((p) => (
          <Link key={p.id} to={`/property/${p.slug}`} className="block group">
            <div className="relative h-[180px] overflow-hidden rounded-[2px] mb-3">
              <img
                src={p.image}
                alt={p.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <p className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-[#1f1f1f] mb-1">{p.propertyType}</p>
            <p className="text-base font-roboto font-medium text-primary mb-1">{p.price}</p>
            <h3 className="text-sm font-roboto font-semibold text-[#011328] leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">{p.title}</h3>
            <p className="text-xs font-roboto text-[#636363] mb-2">{p.area}</p>
            <div className="flex items-center gap-3 flex-wrap text-xs font-roboto text-[#363535]">
              {getPropertySpecs(p.propertyType, {
                beds: p.beds,
                baths: p.baths,
                parking: p.parking,
                sqft: p.sqft,
              }).map((spec) => (
                <span key={spec.key} className="flex items-center gap-1">
                  <i className={`${spec.icon} text-[#636363] text-xs`}></i>{spec.label}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}