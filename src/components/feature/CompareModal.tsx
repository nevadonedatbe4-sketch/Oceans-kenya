import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import type { CompareProperty } from '@/hooks/useCompareToolbar';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: CompareProperty[];
  onRemove: (id: string) => void;
}

function StatBar({ label, values }: { label: string; values: (string | number)[] }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4 font-roboto text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/50">
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-4 text-center font-roboto text-sm text-gray-700">
          {v}
        </td>
      ))}
    </tr>
  );
}

export default function CompareModal({ isOpen, onClose, properties, onRemove }: CompareModalProps) {
  const { format } = useCurrency();

  if (!isOpen || properties.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] mx-4 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/12 shrink-0">
          <div>
            <h2 className="font-roboto font-bold text-lg text-primary">Compare Properties</h2>
            <p className="text-xs font-roboto text-gray-400 mt-0.5">
              {properties.length} properties side by side
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Property headers */}
            <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `repeat(${properties.length}, 1fr)` }}>
              {properties.map((p) => (
                <div key={p.id} className="text-center relative">
                  <button
                    onClick={() => onRemove(p.id)}
                    className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center bg-white border border-primary/12 rounded-full text-gray-400 hover:text-red-500 hover:border-red-200 cursor-pointer transition-colors shadow-sm z-10"
                  >
                    <i className="ri-close-line text-xs"></i>
                  </button>
                  <div className="aspect-[4/3] w-full rounded-lg overflow-hidden mb-3 bg-gray-100">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <Link
                    to={`/property/${p.slug}`}
                    className="block font-roboto font-semibold text-sm text-[#011328] leading-snug mb-1 hover:text-primary transition-colors line-clamp-2"
                    onClick={onClose}
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs font-roboto text-gray-400 flex items-center justify-center gap-1 mb-1.5">
                    <span className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-map-pin-line text-[10px]"></i>
                    </span>
                    {p.location}
                  </p>
                  <p className="text-base font-roboto font-bold text-primary">
                    {format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                  </p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-100 text-[10px] font-roboto font-semibold uppercase tracking-wider text-gray-500 rounded-full">
                    {p.type === 'sale' ? 'For Sale' : 'For Rent'}
                  </span>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto rounded-lg border border-primary/12">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/12">
                    <th className="py-3 px-4 text-left font-roboto text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50 whitespace-nowrap">
                      Feature
                    </th>
                    {properties.map((p) => (
                      <th key={p.id} className="py-3 px-4 text-center font-roboto text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                        {p.title.length > 20 ? p.title.slice(0, 18) + '...' : p.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <StatBar label="Price" values={properties.map((p) => format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR'))} />
                  <StatBar label="Type" values={properties.map((p) => p.type === 'sale' ? 'For Sale' : 'For Rent')} />
                  <StatBar label="Category" values={properties.map((p) => p.category)} />
                  <StatBar label="Location" values={properties.map((p) => p.location)} />
                  <StatBar label="Bedrooms" values={properties.map((p) => p.beds || '—')} />
                  <StatBar label="Bathrooms" values={properties.map((p) => p.baths || '—')} />
                  <StatBar label="Parking" values={properties.map((p) => p.parking || '—')} />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-primary/12 bg-gray-50/50 shrink-0">
          <p className="text-xs font-roboto text-gray-400">
            Click a property name to view full details
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary text-white text-xs font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
          >
            Done Comparing
          </button>
        </div>
      </div>
    </div>
  );
}