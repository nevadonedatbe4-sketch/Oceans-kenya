import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import { broadcastSync } from '@/lib/syncEngine';

interface JvFaq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
}

interface FaqDraft {
  id: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

const inputCls =
  'w-full border border-[#e5e9ee] px-3.5 py-2.5 text-sm font-roboto text-[#001731] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 rounded-lg bg-white';

const labelCls = 'block text-[#001731] font-roboto text-sm font-medium mb-1.5';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function JVFaqs() {
  const [faqs, setFaqs] = useState<JvFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<FaqDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<JvFaq | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: dbError } = await supabase
      .from('jv_faqs')
      .select('*')
      .order('sort_order', { ascending: true });

    if (dbError) {
      setError(dbError.message || 'Failed to load FAQs');
    } else {
      setFaqs((data || []) as JvFaq[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const openAdd = () => {
    setEditing({
      id: null,
      question: '',
      answer: '',
      sort_order: faqs.length + 1,
      is_published: true,
    });
  };

  const openEdit = (faq: JvFaq) => {
    setEditing({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      sort_order: faq.sort_order,
      is_published: faq.is_published,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.question.trim() || !editing.answer.trim()) {
      addToast('Question and answer are required', 'error');
      return;
    }
    setSaving(true);

    const payload = {
      question: editing.question.trim(),
      answer: editing.answer.trim(),
      sort_order: editing.sort_order,
      is_published: editing.is_published,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (editing.id) {
      ({ error: err } = await supabase.from('jv_faqs').update(payload).eq('id', editing.id));
    } else {
      ({ error: err } = await supabase.from('jv_faqs').insert(payload));
    }

    if (err) {
      addToast(err.message, 'error');
    } else {
      addToast(editing.id ? 'FAQ updated' : 'FAQ added', 'success');
      broadcastSync();
      setEditing(null);
      fetchFaqs();
    }
    setSaving(false);
  };

  const handleTogglePublish = async (faq: JvFaq) => {
    const { error: dbError } = await supabase
      .from('jv_faqs')
      .update({ is_published: !faq.is_published })
      .eq('id', faq.id);

    if (dbError) {
      addToast('Failed to update status', 'error');
    } else {
      addToast(faq.is_published ? 'FAQ unpublished' : 'FAQ published', 'success');
      broadcastSync();
      fetchFaqs();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { error: dbError } = await supabase.from('jv_faqs').delete().eq('id', deleteConfirm.id);
    if (dbError) {
      addToast('Failed to delete FAQ', 'error');
    } else {
      addToast('FAQ deleted', 'success');
      broadcastSync();
      setDeleteConfirm(null);
      fetchFaqs();
    }
  };

  const moveFaq = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= faqs.length) return;
    const next = [...faqs];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((f, idx) => ({ ...f, sort_order: idx + 1 }));
    setFaqs(reordered);

    const { error: dbError } = await supabase
      .from('jv_faqs')
      .upsert(reordered.map((f) => ({ id: f.id, sort_order: f.sort_order })));

    if (dbError) {
      addToast('Failed to reorder FAQs', 'error');
      fetchFaqs();
    } else {
      broadcastSync();
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...faqs];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    setFaqs(next.map((f, idx) => ({ ...f, sort_order: idx + 1 })));
  };

  const handleDragEnd = async () => {
    setDragIndex(null);
    const { error: dbError } = await supabase
      .from('jv_faqs')
      .upsert(faqs.map((f) => ({ id: f.id, sort_order: f.sort_order })));
    if (dbError) {
      addToast('Failed to save order', 'error');
      fetchFaqs();
    } else {
      broadcastSync();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-roboto text-[#636363]">
          {faqs.length} FAQ{faqs.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto transition-all whitespace-nowrap cursor-pointer"
        >
          <i className="ri-add-line" />
          Add FAQ
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-6 space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#f7f8fa] rounded" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white rounded-xl py-14 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center">
              <i className="ri-error-warning-line text-red-400 text-2xl" />
            </div>
            <p className="text-sm font-roboto text-[#636363]">{error}</p>
            <button onClick={fetchFaqs} className="inline-flex items-center gap-2 text-sm font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer mt-1">
              <i className="ri-refresh-line" /> Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && faqs.length === 0 && (
        <div className="bg-white rounded-xl py-14 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
              <i className="ri-question-answer-line text-[#0d5959] text-2xl" />
            </div>
            <p className="text-sm font-roboto text-[#636363]">No FAQs yet. Add your first one.</p>
            <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer mt-1">
              <i className="ri-add-line" /> Add FAQ
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {!loading && !error && faqs.length > 0 && (
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="divide-y divide-[#f0f0f0]/60">
            {faqs.map((faq, idx) => (
              <div
                key={faq.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-start gap-3 p-4 hover:bg-[#f7f8fa]/50 transition-colors ${dragIndex === idx ? 'opacity-50' : ''}`}
              >
                {/* Reorder handle */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                  <button
                    onClick={() => moveFaq(idx, -1)}
                    disabled={idx === 0}
                    className="w-6 h-5 flex items-center justify-center rounded text-[#9ca3af] hover:text-[#001731] hover:bg-[#f0f0f0] cursor-pointer disabled:opacity-30"
                    title="Move up"
                  >
                    <i className="ri-arrow-up-s-line text-sm" />
                  </button>
                  <button
                    onClick={() => moveFaq(idx, 1)}
                    disabled={idx === faqs.length - 1}
                    className="w-6 h-5 flex items-center justify-center rounded text-[#9ca3af] hover:text-[#001731] hover:bg-[#f0f0f0] cursor-pointer disabled:opacity-30"
                    title="Move down"
                  >
                    <i className="ri-arrow-down-s-line text-sm" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-jost text-sm font-medium text-[#001731] leading-snug">{faq.question}</h4>
                    <span className={`text-[10px] font-roboto px-2 py-0.5 rounded-full ${faq.is_published ? 'bg-[#e6f4ea] text-[#088135]' : 'bg-[#f7f8fa] text-[#9ca3af]'}`}>
                      {faq.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs font-roboto text-[#636363] mt-1 line-clamp-2">{faq.answer}</p>
                  <p className="text-[10px] font-roboto text-[#9ca3af] mt-1">
                    Order {faq.sort_order} · Updated {formatDate(faq.updated_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublish(faq)}
                    title={faq.is_published ? 'Unpublish' : 'Publish'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${faq.is_published ? 'text-emerald-500 hover:bg-emerald-50' : 'text-[#c0c8d0] hover:text-emerald-400 hover:bg-[#f0f0f0]'}`}
                  >
                    <i className={faq.is_published ? 'ri-eye-line' : 'ri-eye-off-line'} />
                  </button>
                  <button
                    onClick={() => openEdit(faq)}
                    title="Edit"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:text-[#0d5959] hover:bg-[#0d5959]/8 cursor-pointer transition-colors"
                  >
                    <i className="ri-edit-line text-sm" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(faq)}
                    title="Delete"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:text-[#dc2626] hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <i className="ri-delete-bin-line text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="px-4 py-2.5 text-[11px] font-roboto text-[#9ca3af] border-t border-[#f0f0f0]/60">
            Tip: drag a row or use the arrows to reorder. The public FAQ section follows this order.
          </p>
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-jost text-lg font-semibold text-[#001731]">
                {editing.id ? 'Edit FAQ' : 'Add FAQ'}
              </h3>
              <button onClick={() => setEditing(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:bg-[#f0f0f0] cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Question *</label>
                <input
                  value={editing.question}
                  onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                  placeholder="e.g. What exactly is a joint venture in property development?"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Answer *</label>
                <textarea
                  value={editing.answer}
                  onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                  rows={5}
                  maxLength={1000}
                  placeholder="Write the answer..."
                  className={`${inputCls} resize-none`}
                />
                <p className="text-right text-xs text-[#9ca3af] font-roboto mt-1">{editing.answer.length}/1000</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Display order</label>
                  <input
                    type="number"
                    min={1}
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 1 })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={editing.is_published ? 'published' : 'draft'}
                    onChange={(e) => setEditing({ ...editing, is_published: e.target.value === 'published' })}
                    className={`${inputCls} cursor-pointer`}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#f0f0f0]">
              <button
                onClick={() => setEditing(null)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-roboto text-[#636363] border border-[#f0f0f0] hover:text-[#001731] hover:border-[#c0c8d0] transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-lg text-sm font-roboto bg-[#0d5959] hover:bg-[#0d5959]/90 text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
                {saving ? 'Saving...' : 'Save FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete FAQ?"
        message={`This will remove "${deleteConfirm?.question || 'this FAQ'}" from the public site and the admin list. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}