import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import {
  fetchReviews,
  softDeleteReview,
  recomputeAmenityRating,
  type AmenityReview,
} from '@/lib/directory';

interface AmenityReviewsFieldProps {
  /** The place id. Reviews can only be attached to a saved place. */
  amenityId: string | null;
  /** Notifies the parent when the approved review count changes. */
  onCountChange?: (count: number) => void;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl leading-none cursor-pointer transition-colors ${
            value >= n ? 'text-amber-500' : 'text-[#d6dbe1]'
          }`}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/**
 * Manage the structured reviews shown on a place's Reviews tab. Lets an admin
 * paste in reviews captured from Google (rating + reviewer + text) so they sit
 * alongside visitor reviews, and remove any that are no longer wanted.
 */
export default function AmenityReviewsField({ amenityId, onCountChange }: AmenityReviewsFieldProps) {
  const [reviews, setReviews] = useState<AmenityReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewer, setReviewer] = useState('');
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    if (!amenityId) {
      setReviews([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchReviews(amenityId);
      setReviews(list);
    } catch {
      addToast('Could not load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [amenityId]);

  useEffect(() => {
    load();
  }, [load]);

  const approvedCount = reviews.filter((r) => r.moderation_status === 'approved').length;

  const handleAdd = async () => {
    if (!amenityId) return;
    if (text.trim().length < 5) {
      addToast('Please write the review text', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('amenity_reviews').insert({
      amenity_id: amenityId,
      rating,
      review_text: text.trim(),
      reviewer_name: reviewer.trim() || null,
      moderation_status: 'approved',
    });
    if (error) {
      addToast('Failed to add review', 'error');
      setSaving(false);
      return;
    }
    await recomputeAmenityRating(amenityId);
    await load();
    setRating(5);
    setReviewer('');
    setText('');
    setSaving(false);
    addToast('Review added', 'success');
    onCountChange?.(approvedCount + 1);
  };

  const handleRemove = async (id: string) => {
    const ok = await softDeleteReview(id);
    if (!ok) return;
    if (amenityId) {
      await recomputeAmenityRating(amenityId);
      await load();
      onCountChange?.(Math.max(0, approvedCount - 1));
    }
    addToast('Review moved to the review bin', 'success');
  };

  return (
    <div className="space-y-4">
      {!amenityId ? (
        <p className="text-sm text-[#7a8a99]">
          Save this place first, then you can add reviews here.
        </p>
      ) : (
        <>
          {/* Existing reviews */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#7a8a99]">
                <i className="ri-loader-4-line animate-spin" /> Loading reviews…
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-[#7a8a99]">No reviews yet — add one below.</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#e8edf2] bg-[#fbfbfb]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-500 text-sm">
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(Math.max(0, 5 - r.rating))}
                      </span>
                      <span className="text-xs text-[#7a8a99]">
                        {r.reviewer_name || 'Anonymous'}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          r.moderation_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {r.moderation_status}
                      </span>
                    </div>
                    <p className="text-sm text-[#33414f] leading-relaxed break-words">{r.review_text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(r.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[#9ca3af] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                    aria-label="Remove review"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add a review */}
          <div className="rounded-lg border border-dashed border-[#e8edf2] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#7a8a99] uppercase tracking-wider">Add a review</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Rating</label>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Reviewer name</label>
                <input
                  type="text"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="e.g. Wanjiku M."
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Review text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder="Paste the review text here…"
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto min-h-[70px] resize-none focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0d5959] text-white text-sm font-medium hover:bg-[#0b4a4a] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <i className={`${saving ? 'ri-loader-4-line animate-spin' : 'ri-add-line'}`} />
              {saving ? 'Adding…' : 'Add review'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}