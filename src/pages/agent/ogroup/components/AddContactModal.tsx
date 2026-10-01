import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { resolveProfileByContact } from '../teamDirectory';
import { ModalShell } from './Modals';

interface AddContactModalProps {
  onClose: () => void;
  /** Called with a real account id when the contact matched a teammate. */
  onStartChat: (userId: string) => void;
  /** Called after a successful save so the directory can refresh. */
  onSaved: () => void;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]';

/**
 * WhatsApp-style "add a contact": save a name + email/phone to the personal
 * contact book, then — if the details match a registered teammate — offer to
 * jump straight into a chat. Matched contacts can message you back and vice
 * versa, since a chat is just a normal 1:1 conversation.
 */
export function AddContactModal({ onClose, onStartChat, onSaved }: AddContactModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ linkedUserId: string | null; name: string } | null>(null);

  const save = async () => {
    if (!user) { setError('Your session has expired. Please sign in again.'); return; }
    if (!name.trim()) { setError('Please enter a name.'); return; }
    if (!email.trim() && !phone.trim()) { setError('Add an email or phone number so they can be matched to an account.'); return; }

    setSaving(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from('agent_contacts').insert({
        user_id: user.id,
        agent_id: user.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        source: 'Messenger',
      });
      if (insErr) throw insErr;

      const match = await resolveProfileByContact(email.trim() || null, phone.trim() || null);
      onSaved();
      setResult({
        linkedUserId: match && match.user_id !== user.id ? match.user_id : null,
        name: match?.name || name.trim(),
      });
    } catch (e) {
      setError((e as Error)?.message || 'Could not save this contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Add contact" onClose={onClose}>
      {result ? (
        <div className="space-y-4 py-2 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#00a884]/15 text-[#00a884] flex items-center justify-center">
            <i className={result.linkedUserId ? 'ri-user-follow-line text-2xl' : 'ri-check-line text-2xl'} />
          </div>
          {result.linkedUserId ? (
            <>
              <p className="text-sm text-[#e9edef]">
                <span className="font-semibold">{result.name}</span> is on the platform. Start a chat now — you&apos;ll both see each other&apos;s messages.
              </p>
              <button
                onClick={() => onStartChat(result.linkedUserId as string)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00a884] text-[#0b141a] text-sm font-semibold hover:bg-[#06cf9c] cursor-pointer whitespace-nowrap"
              >
                <i className="ri-chat-new-line" /> Message {result.name}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#e9edef]">
                Saved <span className="font-semibold">{result.name}</span> to your contacts.
              </p>
              <p className="text-xs text-[#8696a0]">
                They aren&apos;t on the platform yet. They&apos;ll appear in your Messenger as soon as they join — then you can chat both ways.
              </p>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#202c33] text-[#e9edef] text-sm font-semibold hover:bg-[#2a3942] cursor-pointer whitespace-nowrap"
              >
                Done
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#8696a0]">
            Save a teammate or client. If their email or phone matches an account, you can start chatting right away.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              <i className="ri-error-warning-line text-sm mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#8696a0]">Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" maxLength={80} className={`mt-1 ${INPUT_CLS}`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#8696a0]">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.com" className={`mt-1 ${INPUT_CLS}`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#8696a0]">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7xx xxx xxx" className={`mt-1 ${INPUT_CLS}`} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:bg-[#202c33] cursor-pointer whitespace-nowrap">Cancel</button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00a884] text-[#0b141a] text-sm font-semibold hover:bg-[#06cf9c] cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {saving ? <><i className="ri-loader-4-line animate-spin" /> Saving...</> : <><i className="ri-save-line" /> Save contact</>}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}