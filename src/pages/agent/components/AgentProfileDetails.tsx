import { useEffect, useState } from 'react';
import { supabase, uploadFileViaEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { Loader2, Camera, UserRound, Phone, MapPin, CheckCircle2, XCircle, Save } from 'lucide-react';

interface AgentProfileDetailsProps {
  agentId: string | null;
}

export default function AgentProfileDetails({ agentId }: AgentProfileDetailsProps) {
  const { user, refreshProfile } = useAuth();
  const { agentProfile, loading } = useAgentProfile();

  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!agentProfile || loading) return;
    if (agentProfile.name && !name) setName(agentProfile.name);
    if (agentProfile.title) setTitle(agentProfile.title);
    if (agentProfile.phone) setPhone(agentProfile.phone);
    if (agentProfile.bio) setBio(agentProfile.bio);
    if (agentProfile.avatar_url) setAvatarUrl(agentProfile.avatar_url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentProfile, loading]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `agents/${user.id}/avatar-${Date.now()}.${ext}`;
      const { url } = await uploadFileViaEdgeFunction(file, path, 'agent-avatars');
      setAvatarUrl(url);
      await supabase.from('profiles').update({ avatar: url }).eq('user_id', user.id);
      if (agentId) {
        await supabase.from('agents').update({ avatar_url: url }).eq('id', agentId);
      }
      setMessage({ type: 'success', text: 'Profile photo updated.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to upload photo.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      if (agentId) {
        await supabase.from('agents').update({
          name: name.trim(),
          title: title.trim() || null,
          phone: phone.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
          bio: bio.trim() || null,
        }).eq('id', agentId);
      }
      await supabase.from('profiles').update({ name: name.trim(), title: title.trim() || null, phone: phone.trim() || null }).eq('user_id', user.id);
      await refreshProfile();
      setMessage({ type: 'success', text: 'Your profile has been saved.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save your profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e4e9e6] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center overflow-hidden border-4 border-[#eef2f0]">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name || 'Agent'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-roboto font-bold">{(name || 'A').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0d5959] hover:bg-[#0a4a4a] flex items-center justify-center cursor-pointer text-white shadow-lg">
            <Camera size={15} />
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-roboto font-semibold text-lg text-[#1a1a2e]">{name || 'Your profile'}</h3>
          <p className="text-sm text-gray-500 font-roboto">{title || 'Add your professional title'}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 bg-accent hover:bg-[#0a4a4a] text-white px-5 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {message && (
        <div className={`flex items-start gap-2 text-sm px-4 py-3 rounded-lg font-roboto ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="mt-0.5 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#eef2f0]">
          <h3 className="font-roboto font-semibold text-[#1a1a2e]">Profile details</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Wanjiku" className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Professional title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Sales Agent" className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <div className="relative">
              <input value={user?.email || ''} readOnly className="w-full px-3.5 py-2.5 pl-9 rounded-md border border-gray-200 bg-gray-50 text-sm font-roboto text-gray-400 outline-none" />
              <UserRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
            <div className="relative">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7xx xxx xxx" className="w-full px-3.5 py-2.5 pl-9 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400" />
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Location / area</label>
            <div className="relative">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Westlands, Nairobi" className="w-full px-3.5 py-2.5 pl-9 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400" />
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Website</label>
            <div className="relative">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="w-full px-3.5 py-2.5 pl-9 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400" />
              <i className="ri-global-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">About / bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={600} placeholder="Introduce yourself to clients — your experience, specialities and approach." className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none placeholder:text-gray-400" />
            <p className="text-[11px] text-gray-400 font-roboto text-right mt-1">{bio.length}/600</p>
          </div>
        </div>
      </div>
    </div>
  );
}