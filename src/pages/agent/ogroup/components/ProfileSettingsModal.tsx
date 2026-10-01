import { useEffect, useRef, useState } from 'react';
import { supabase, uploadFileViaEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from './Avatar';
import { ImageCropModal } from './ImageCropModal';
import {
  getChatNotifyPrefs, setChatNotifyPrefs, desktopNotificationsSupported,
  desktopPermission, requestDesktopPermission, playChatChime, type DesktopPermission,
} from '../chatNotify';

interface ProfileSettingsModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

const ABOUT_MAX = 139;

/**
 * The signed-in member's Messenger profile: photo, About line, manual
 * availability, job title and phone. Only the account holder can edit their own
 * profile (enforced by RLS), and the photo is cropped to a square before saving.
 */
export function ProfileSettingsModal({ onClose, onSaved }: ProfileSettingsModalProps) {
  const { user, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [about, setAbout] = useState('');
  const [country, setCountry] = useState('');
  const [department, setDepartment] = useState('');
  const [office, setOffice] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || null);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notifySound, setNotifySound] = useState(true);
  const [notifyDesktop, setNotifyDesktop] = useState(false);
  const [permission, setPermission] = useState<DesktopPermission>('default');

  useEffect(() => {
    const prefs = getChatNotifyPrefs();
    setNotifySound(prefs.sound);
    setNotifyDesktop(prefs.desktop);
    if (desktopNotificationsSupported()) setPermission(desktopPermission());
  }, []);

  const toggleSound = () => {
    const next = !notifySound;
    setNotifySound(next);
    setChatNotifyPrefs({ sound: next });
    if (next) playChatChime();
  };

  const toggleDesktop = async () => {
    if (notifyDesktop) {
      setNotifyDesktop(false);
      setChatNotifyPrefs({ desktop: false });
      return;
    }
    const result = await requestDesktopPermission();
    setPermission(result);
    if (result === 'granted') {
      setNotifyDesktop(true);
      setChatNotifyPrefs({ desktop: true });
    } else {
      setNotifyDesktop(false);
      setChatNotifyPrefs({ desktop: false });
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, title, about, phone, avatar, country, department, office')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!active) return;
        if (profile) {
          setName(profile.name || '');
          setTitle(profile.title || '');
          setPhone(profile.phone || '');
          setAbout(profile.about || '');
          setCountry(profile.country || '');
          setDepartment(profile.department || '');
          setOffice(profile.office || '');
          setAvatarUrl(profile.avatar || null);
        }
      } catch {
        // Keep whatever we already have; the user can still edit and save.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' });
      return;
    }
    setMessage(null);
    setCropFile(file);
  };

  const savePhoto = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    setMessage(null);
    try {
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { url } = await uploadFileViaEdgeFunction(file, `agents/${user.id}/avatar-${Date.now()}.jpg`, 'agent-avatars');
      const { error } = await supabase.from('profiles').update({ avatar: url }).eq('user_id', user.id);
      if (error) throw error;
      setAvatarUrl(url);
      setCropFile(null);
      await refreshProfile();
      onSaved?.();
      setMessage({ type: 'success', text: 'Your profile photo was updated.' });
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error)?.message || 'Could not upload the photo. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim() || user.name,
          title: title.trim() || null,
          phone: phone.trim() || null,
          about: about.trim() || null,
          country: country.trim() || null,
          department: department.trim() || null,
          office: office.trim() || null,
        })
        .eq('user_id', user.id);
      if (error) throw error;

      await refreshProfile();
      onSaved?.();
      setMessage({ type: 'success', text: 'Your profile has been saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error)?.message || 'Could not save your profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploading;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-[#111b21] rounded-2xl border border-[#2a3942] flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
          <div>
            <h2 className="text-lg font-semibold text-[#e9edef]">My profile</h2>
            <p className="text-[11px] text-[#8696a0]">This is how teammates see you in the Messenger</p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-[#8696a0] hover:text-[#e9edef] cursor-pointer p-1 disabled:opacity-40"><i className="ri-close-line text-xl" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={name} avatar_url={avatarUrl} userId={user?.id} size={84} />
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#00a884] text-[#0b141a] flex items-center justify-center border-2 border-[#111b21]">
                <i className="ri-camera-line text-sm" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#e9edef]">{name || 'Your name'}</p>
              <p className="text-xs text-[#8696a0] mt-0.5">A clear, square photo works best.</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202c33] text-[#00a884] text-xs font-semibold hover:bg-[#2a3942] cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {uploading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-upload-2-line" />}
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
            </div>
          </div>

          {/* name */}
          <div>
            <label className="text-xs font-semibold text-[#8696a0]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={loading} className="mt-1 w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#8696a0]">Job title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Senior Sales Agent" disabled={loading} className="mt-1 w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8696a0]">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="+254 7xx xxx xxx" disabled={loading} className="mt-1 w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
            </div>
          </div>

          {/* organization */}
          <div>
            <label className="text-xs font-semibold text-[#8696a0]">Organization</label>
            <p className="text-[11px] text-[#667781] mt-1 mb-2">Teammates across every country see this on your profile. Country is just a label — everyone can message everyone.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} placeholder="Country · e.g. Kenya" disabled={loading} className="w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
              </div>
              <div>
                <input value={office} onChange={(e) => setOffice(e.target.value)} maxLength={60} placeholder="Office · e.g. Nairobi" disabled={loading} className="w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
              </div>
              <div>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={60} placeholder="Team · e.g. Sales" disabled={loading} className="w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
              </div>
            </div>
          </div>

          {/* about */}
          <div>
            <label className="text-xs font-semibold text-[#8696a0]">About</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value.slice(0, ABOUT_MAX))}
              rows={2}
              maxLength={ABOUT_MAX}
              placeholder="Available · In a meeting · Working from home…"
              disabled={loading}
              className="mt-1 w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] resize-none"
            />
            <p className="text-[11px] text-[#667781] text-right mt-1">{about.length}/{ABOUT_MAX}</p>
          </div>

          {/* notifications */}
          <div>
            <label className="text-xs font-semibold text-[#8696a0]">Message notifications</label>
            <p className="text-[11px] text-[#667781] mt-1 mb-2">Control how Oceans Chat alerts you to new messages.</p>
            <div className="space-y-2">
              <button
                onClick={toggleSound}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] cursor-pointer"
              >
                <span className="flex items-center gap-2.5 text-sm text-[#e9edef]"><i className="ri-volume-up-line text-[#00a884]" /> Notification sound</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${notifySound ? 'bg-[#00a884] text-[#0b141a]' : 'bg-[#2a3942] text-[#8696a0]'}`}>{notifySound ? 'On' : 'Off'}</span>
              </button>
              <button
                onClick={toggleDesktop}
                disabled={!desktopNotificationsSupported()}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] cursor-pointer disabled:opacity-50"
              >
                <span className="flex items-center gap-2.5 text-sm text-[#e9edef]"><i className="ri-computer-line text-[#00a884]" /> Desktop notifications</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${notifyDesktop && permission === 'granted' ? 'bg-[#00a884] text-[#0b141a]' : 'bg-[#2a3942] text-[#8696a0]'}`}>
                  {!desktopNotificationsSupported() ? 'Unavailable' : permission === 'denied' ? 'Blocked' : notifyDesktop ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            {permission === 'denied' && desktopNotificationsSupported() && (
              <p className="text-[11px] text-amber-300 mt-1.5">Your browser has blocked notifications for this site. Enable them in your browser settings to turn this on.</p>
            )}
          </div>

          {message && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/12 text-red-300 border border-red-500/25'}`}>
              <i className={`${message.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} mt-0.5 flex-shrink-0`} />
              <span>{message.text}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#2a3942] flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:bg-[#202c33] cursor-pointer whitespace-nowrap disabled:opacity-50">Close</button>
          <button
            onClick={save}
            disabled={busy || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00a884] text-[#0b141a] text-sm font-semibold hover:bg-[#06cf9c] cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          busy={uploading}
          onCancel={() => setCropFile(null)}
          onConfirm={savePhoto}
        />
      )}
    </div>
  );
}