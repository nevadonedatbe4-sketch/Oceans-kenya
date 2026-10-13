import { useEffect, useMemo, useState } from 'react';
import { fetchStaffDirectory, type StaffRow } from '@/pages/agent/ogroup/staffDirectory';

interface ForwardModalProps {
  subject: string;
  originalSender: string;
  body: string;
  onClose: () => void;
  /** Email delivery (existing behaviour). */
  onForward: (recipientEmail: string, note: string) => Promise<void>;
  /** Internal delivery — forward to a teammate's CRM messenger. */
  onForwardToTeam?: (recipientUserId: string, recipientName: string, note: string) => Promise<void>;
}

type Mode = 'team' | 'email';

/**
 * Forward Message.
 *
 * Sends the original message either to an internal teammate (via the CRM
 * messenger) or to an external email address — both from one interface. The
 * Send button is always visible and only disabled while there is nothing valid
 * to send or a send is already in flight.
 */
export default function ForwardModal({
  subject,
  originalSender,
  body,
  onClose,
  onForward,
  onForwardToTeam,
}: ForwardModalProps) {
  const canForwardToTeam = typeof onForwardToTeam === 'function';
  const [mode, setMode] = useState<Mode>(canForwardToTeam ? 'team' : 'email');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [team, setTeam] = useState<StaffRow[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamQuery, setTeamQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Load the team directory lazily, the first time the Team tab is shown.
  useEffect(() => {
    if (mode !== 'team' || !canForwardToTeam || team.length > 0 || teamLoading) return;
    setTeamLoading(true);
    fetchStaffDirectory()
      .then((rows) => setTeam(rows))
      .catch(() => setError('Could not load your team list. You can still forward by email.'))
      .finally(() => setTeamLoading(false));
  }, [mode, canForwardToTeam, team.length, teamLoading]);

  const filteredTeam = useMemo(() => {
    const q = teamQuery.trim().toLowerCase();
    const list = [...team].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (!q) return list;
    return list.filter((m) => `${m.name || ''} ${m.email || ''} ${m.title || ''}`.toLowerCase().includes(q));
  }, [team, teamQuery]);

  const selectedMember = team.find((m) => m.user_id === selectedUserId) || null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSend = mode === 'team' ? !!selectedMember : emailValid;

  const handleSubmit = async () => {
    setError('');
    if (mode === 'team') {
      if (!selectedMember || !onForwardToTeam) {
        setError('Choose a teammate to forward this message to.');
        return;
      }
    } else if (!emailValid) {
      setError('Enter a valid email address.');
      return;
    }

    setSending(true);
    try {
      if (mode === 'team' && selectedMember && onForwardToTeam) {
        await onForwardToTeam(selectedMember.user_id, selectedMember.name || 'Teammate', note.trim());
      } else {
        await onForward(email.trim(), note.trim());
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to forward message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-background-200">
          <h3 className="text-base font-semibold text-foreground-900">Forward message</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line text-foreground-600 text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Recipient mode */}
          {canForwardToTeam && (
            <div className="flex items-center gap-1 p-1 rounded-full bg-background-100 w-fit">
              <button
                type="button"
                onClick={() => { setMode('team'); setError(''); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${mode === 'team' ? 'bg-[#0d5959] text-white' : 'text-foreground-600 hover:text-foreground-900'}`}
              >
                <i className="ri-team-line mr-1.5" /> Team member
              </button>
              <button
                type="button"
                onClick={() => { setMode('email'); setError(''); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${mode === 'email' ? 'bg-[#0d5959] text-white' : 'text-foreground-600 hover:text-foreground-900'}`}
              >
                <i className="ri-mail-send-line mr-1.5" /> Email
              </button>
            </div>
          )}

          {/* Team picker */}
          {mode === 'team' ? (
            <div>
              <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                Forward to <span className="text-red-600">*</span>
              </label>
              <div className="relative mb-2">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
                <input
                  type="text"
                  value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)}
                  placeholder="Search teammates by name or email"
                  className="w-full pl-9 pr-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 bg-white"
                />
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-background-200 divide-y divide-background-100">
                {teamLoading ? (
                  <div className="flex items-center justify-center py-8 text-foreground-400">
                    <i className="ri-loader-4-line animate-spin text-lg" />
                  </div>
                ) : filteredTeam.length === 0 ? (
                  <p className="text-sm text-foreground-500 text-center py-8">No teammates found.</p>
                ) : (
                  filteredTeam.map((m) => {
                    const active = m.user_id === selectedUserId;
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => setSelectedUserId(m.user_id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${active ? 'bg-[#0d5959]/8' : 'hover:bg-background-50'}`}
                      >
                        <span className="w-9 h-9 rounded-full bg-[#0d5959]/10 text-[#0d5959] flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                          {(m.name || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground-900 truncate">{m.name || 'Unnamed'}</span>
                          <span className="block text-xs text-foreground-500 truncate">{m.title || m.email || 'Team member'}</span>
                        </span>
                        <i className={`${active ? 'ri-checkbox-circle-fill text-[#0d5959]' : 'ri-checkbox-blank-circle-line text-foreground-300'} text-lg`} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                To <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
              Original message
            </label>
            <div className="bg-background-50 rounded-lg p-3 border border-background-200">
              <p className="text-xs font-semibold text-foreground-900">{subject || 'No subject'}</p>
              <p className="text-[11px] text-foreground-500 mt-0.5">From: {originalSender || 'Unknown'}</p>
              <p className="text-xs text-foreground-700 mt-2 line-clamp-4 whitespace-pre-wrap">{body || 'No message'}</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
              Add a note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add a note for the recipient..."
              className="w-full px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 bg-white resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <i className="ri-error-warning-line" /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 pb-6 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={sending || !canSend}
            className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0a4747] text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {sending ? (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-loader-4-line animate-spin" /> Sending...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-send-plane-fill" /> Send
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}