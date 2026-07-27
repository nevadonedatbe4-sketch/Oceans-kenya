import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import type { DevelopmentGroup } from '@/hooks/useNewDevelopments';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  compareIds: string[];
  developments: DevelopmentGroup[];
  onRemove: (id: string) => void;
}

export default function CompareModal({ isOpen, onClose, compareIds, developments, onRemove }: CompareModalProps) {
  const { format } = useCurrency();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  if (!isOpen) return null;

  const selected = compareIds
    .map((id) => developments.find((d) => d.id === id))
    .filter(Boolean) as DevelopmentGroup[];

  if (selected.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="bg-white rounded-sm max-w-md w-full p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
              <i className="ri-scales-line text-xl text-stone-400"></i>
            </div>
            <h3 className="font-prata text-primary text-lg mb-2">Nothing to Compare</h3>
            <p className="text-stone-400 font-roboto text-sm mb-4">Select developments using the checkboxes to start comparing.</p>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              <i className="ri-arrow-left-line"></i>Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rows = [
    { key: 'image', label: '' },
    { key: 'name', label: 'Development' },
    { key: 'developer', label: 'Developer' },
    { key: 'location', label: 'Location' },
    { key: 'price', label: 'Price Range' },
    { key: 'beds', label: 'Bed Options' },
    { key: 'status', label: 'Status' },
    { key: 'completion', label: 'Completion' },
    { key: 'type', label: 'Property Type' },
    { key: 'action', label: '' },
  ];

  function renderCell(dev: DevelopmentGroup, key: string) {
    const isCompleted = dev.completionDate && (dev.completionDate.toLowerCase() === 'completed' || dev.completionDate.toLowerCase() === 'ready');

    switch (key) {
      case 'image':
        return (
          <Link to={`/property/${dev.slug}`} onClick={onClose}>
            <div className="w-full h-28 sm:h-32 rounded-sm overflow-hidden bg-stone-100">
              {dev.image ? (
                <img src={dev.image} alt={dev.name} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-building-line text-2xl text-stone-300"></i>
                </div>
              )}
            </div>
          </Link>
        );
      case 'name':
        return (
          <Link to={`/property/${dev.slug}`} onClick={onClose} className="font-prata text-primary text-sm hover:text-golden transition-colors">
            {dev.name}
          </Link>
        );
      case 'developer':
        return <span className="font-roboto text-stone-500 text-xs">{dev.developer || '—'}</span>;
      case 'location':
        return (
          <span className="font-roboto text-stone-500 text-xs flex items-center gap-1">
            <i className="ri-map-pin-2-line text-golden text-[10px]"></i>
            {dev.location}
          </span>
        );
      case 'price':
        return (
          <div className="space-y-0.5">
            {dev.unitOptions.map((opt, idx) => (
              <p key={idx} className="font-roboto text-xs text-primary font-semibold">
                {opt.beds} bed: {format(opt.fromPrice, opt.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
              </p>
            ))}
          </div>
        );
      case 'beds':
        return (
          <div className="flex flex-wrap gap-1">
            {dev.unitOptions.map((opt, idx) => (
              <span key={idx} className="text-[10px] font-roboto bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-sm">
                {opt.beds} {opt.beds === 1 ? 'bed' : 'beds'}
              </span>
            ))}
          </div>
        );
      case 'status':
        return (
          <span className={`text-[10px] font-roboto font-semibold uppercase tracking-wider px-2 py-0.5 ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-accent/10 text-accent'}`}>
            {isCompleted ? 'Completed' : 'Off-Plan'}
          </span>
        );
      case 'completion':
        return <span className="font-roboto text-stone-500 text-xs">{isCompleted ? 'Ready now' : dev.completionDate || '—'}</span>;
      case 'type':
        return <span className="font-roboto text-stone-500 text-xs capitalize">{dev.propertyType}</span>;
      case 'action':
        return (
          <Link
            to={`/property/${dev.slug}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-roboto text-[10px] tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
          >
            <i className="ri-eye-line"></i>View
          </Link>
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-sm max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#f0f0f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-primary/5 rounded-full">
              <i className="ri-scales-line text-primary"></i>
            </div>
            <div>
              <h3 className="font-prata text-primary text-base">Compare Developments</h3>
              <p className="text-stone-400 font-roboto text-xs">Side-by-side comparison of {selected.length} development{selected.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-primary cursor-pointer transition-colors"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-auto p-5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-roboto text-xs text-stone-400 uppercase tracking-wider py-2 pr-4 w-32 sticky left-0 bg-white z-10">Feature</th>
                  {selected.map((dev) => (
                    <th key={dev.id} className="text-left py-2 px-3 min-w-[180px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-prata text-primary text-sm line-clamp-1">{dev.name}</span>
                        <button
                          onClick={() => onRemove(dev.id)}
                          className="w-6 h-6 flex items-center justify-center text-stone-300 hover:text-red-400 cursor-pointer transition-colors flex-shrink-0"
                          title="Remove from comparison"
                        >
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className={`border-t transition-colors ${hoveredRow === row.key ? 'bg-stone-50/50' : ''}`}
                    style={{ borderColor: '#f0f0f0' }}
                    onMouseEnter={() => setHoveredRow(row.key)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="py-3 pr-4 font-roboto text-xs text-stone-400 font-medium sticky left-0 bg-white z-10">
                      {row.label}
                    </td>
                    {selected.map((dev) => (
                      <td key={`${dev.id}-${row.key}`} className="py-3 px-3 align-top">
                        {renderCell(dev, row.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: '#f0f0f0' }}>
          <p className="text-stone-400 font-roboto text-xs">
            {selected.length < 3 ? `You can add up to ${3 - selected.length} more` : 'Maximum 3 developments'}
          </p>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-primary font-roboto text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-stone-200 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}