interface StatsBarProps {
  title: string;
  location: string;
  price: string;
  propertyType: string;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  ref: string;
  purpose: string;
}

export default function PropertyStatsBar({ title, location, price, propertyType, beds, baths, parking, ref, purpose }: StatsBarProps) {
  const stats = [
    { icon: 'ri-home-5-line', label: 'Type', value: propertyType ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1) : 'N/A' },
    { icon: 'ri-hotel-bed-line', label: 'Beds', value: beds != null && beds > 0 ? String(beds) : 'N/A' },
    { icon: 'fa-solid fa-bath', label: 'Baths', value: baths != null && baths > 0 ? String(baths) : 'N/A' },
    { icon: 'ri-car-line', label: 'Garage', value: parking != null && parking > 0 ? String(parking) : 'N/A' },
    { icon: 'ri-fingerprint-line', label: 'ID', value: ref },
  ];

  return (
    <div className="bg-white border border-stone-200 rounded-[2px] p-3 md:p-5 lg:p-6">
      {/* Top row: title/location + price */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4 mb-3 md:mb-5">
        <div className="flex-1 min-w-0">
          <h1 className="font-roboto font-medium text-[#011328] leading-tight mb-1 md:mb-2" style={{ fontSize: 'clamp(18px, 5vw, 26px)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {title}
          </h1>
          <p className="flex items-center gap-1.5 text-xs md:text-sm text-stone-500 font-roboto">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-map-pin-2-line text-golden text-xs md:text-sm"></i>
            </span>
            {location}
          </p>
        </div>
        <div className="md:text-right shrink-0">
          <p className="font-roboto font-medium text-[#002349]" style={{ fontSize: 'clamp(18px, 5vw, 26px)', whiteSpace: 'nowrap' }}>
            {price}
          </p>
          {purpose === 'rent' && (
            <p className="text-stone-400 text-[10px] md:text-xs font-roboto mt-0.5">per calendar month</p>
          )}
        </div>
      </div>

      {/* 5-column stat strip */}
      <div className="border border-stone-200 rounded-[2px]">
        <div className="grid grid-cols-5 divide-x divide-stone-200">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center py-2 md:py-3 lg:py-4 px-1.5 md:px-2 text-center">
              <span className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-stone-400 mb-0.5 md:mb-1.5">
                <i className={`${stat.icon} text-xs md:text-sm`}></i>
              </span>
              <p className="text-primary font-roboto text-xs md:text-sm font-semibold">{stat.value}</p>
              <p className="text-stone-400 font-roboto text-[9px] uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}