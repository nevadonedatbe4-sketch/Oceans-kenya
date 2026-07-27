import { Link } from 'react-router-dom';

interface RecentProperty {
  id: string;
  title: string;
  location: string | null;
  price: number | null;
  status: string;
  property_type: string | null;
  is_published: boolean;
  created_at: string;
}

interface RecentPropertiesProps {
  properties: RecentProperty[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  available: 'bg-[#e6f4ea] text-[#088135]',
  sold: 'bg-[#001731]/8 text-[#001731]',
  rented: 'bg-[#0d5959]/8 text-[#0d5959]',
  hidden: 'bg-[#f7f8fa] text-[#9ca3af]',
};

function formatCurrency(val: number) {
  return `KSh ${val.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RecentProperties({ properties, loading }: RecentPropertiesProps) {
  return (
    <div className="relative bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />

      <div className="bg-[#0d5959]/10 lg:bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/20 lg:bg-[#0d5959]/10 flex items-center justify-center">
            <i className="ri-building-4-line text-[#5eead4] lg:text-[#0d5959] text-sm" />
          </div>
          <div>
            <h3 className="font-inter text-sm sm:text-base font-medium text-white lg:text-[#001731]">Recent Properties</h3>
            <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Latest listings added</p>
          </div>
        </div>
        <Link
          to="/crm/listings"
          className="text-xs sm:text-sm font-inter text-[#5eead4] lg:text-[#0d5959] hover:text-[#5eead4] lg:hover:text-[#001731] transition-colors whitespace-nowrap cursor-pointer"
        >
          View all
        </Link>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-[#1c3a5e]">
              <div className="h-3.5 w-36 bg-[#012a52] rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" />
            </div>
          ))
        ) : properties.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm font-inter text-[#6b7280]">
            No properties yet
          </div>
        ) : (
          properties.map((prop) => (
            <div key={prop.id} className="px-4 py-3 border-b border-[#1c3a5e]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-inter text-white font-semibold truncate pr-3">
                  {(() => {
                    const words = prop.title.split(/\s+/);
                    return words.length > 7 ? words.slice(0, 7).join(' ') + '...' : prop.title;
                  })()}
                </p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize whitespace-nowrap flex-shrink-0 ${
                  prop.status === 'available' ? 'bg-[#088135]/20 text-[#5eead4]' :
                  prop.status === 'sold' ? 'bg-[#001731]/30 text-white' :
                  prop.status === 'rented' ? 'bg-[#0d5959]/30 text-[#5eead4]' :
                  'bg-[#1c3a5e] text-[#6b7280]'
                }`}>
                  {prop.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs font-inter text-[#6b7280]">{prop.location || '—'}</p>
                <p className="text-xs font-inter text-white">{prop.price ? formatCurrency(prop.price) : '—'}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f0f0]">
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">
                Property
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider hidden sm:table-cell">
                Price
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider hidden md:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-4 w-36 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <div className="h-4 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-5 w-16 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <div className="h-4 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 md:px-5 py-8 text-center text-sm font-inter text-[#636363]">
                  No properties yet
                </td>
              </tr>
            ) : (
              properties.map((prop) => (
                <tr key={prop.id} className="hover:bg-[#f7f8fa]/60 transition-colors">
                  <td className="px-4 md:px-5 py-3">
                    <div>
                      <p className="text-sm font-inter text-[#001731] font-semibold">
                        {(() => {
                          const words = prop.title.split(/\s+/);
                          return words.length > 7 ? words.slice(0, 7).join(' ') + '...' : prop.title;
                        })()}
                      </p>
                      <p className="text-xs font-inter text-[#636363]">{prop.location || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <p className="text-sm font-inter text-[#001731]">
                      {prop.price ? formatCurrency(prop.price) : '—'}
                    </p>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize whitespace-nowrap ${statusStyles[prop.status] || 'bg-[#f7f8fa] text-[#9ca3af]'}`}>
                      {prop.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <span className="text-xs font-inter text-[#636363]">
                      {formatDate(prop.created_at)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}