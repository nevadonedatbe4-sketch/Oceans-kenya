import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';

interface ProfileData {
  name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
  status: string | null;
  avatar: string | null;
  created_at: string | null;
}

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('name, email, role, phone, status, avatar, created_at')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(data || null);
      setLoading(false);
    };
    fetchProfile();
  }, [user?.id]);

  const handleAvatarClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;

      const { url } = await uploadImageViaEdgeFunction(file, path, 'agent-avatars');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: url })
        .eq('user_id', user.id);

      if (updateError) {
        addToast(`Failed to save avatar: ${updateError.message}`, 'error');
      } else {
        setProfile((prev) => prev ? { ...prev, avatar: url } : null);
        await refreshProfile();
        addToast('Avatar updated!', 'success');
      }
    } catch (err: any) {
      addToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const profileName = profile?.name || user?.name || 'Unknown';
  const profileEmail = profile?.email || user?.email || '';
  const profileRole = profile?.role || user?.role || 'agent';
  const profilePhone = profile?.phone || '';
  const profileStatus = profile?.status || 'active';
  const profileAvatar = profile?.avatar || user?.avatar || null;
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#012144] lg:bg-white rounded-lg p-8 md:p-10">
        {/* Avatar Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative group">
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center cursor-pointer transition-all ring-2 ring-offset-2 ring-transparent hover:ring-[#0d5959] bg-[#001731] lg:bg-[#001731]"
              title="Click to change avatar"
            >
              {uploading ? (
                <Loader2 size={22} className="animate-spin text-white" />
              ) : profileAvatar ? (
                <img src={profileAvatar} alt={profileName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xl font-semibold">
                  {profileName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            {/* Hover overlay */}
            <div
              onClick={handleAvatarClick}
              className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/50 transition-opacity cursor-pointer ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <i className="ri-camera-line text-white text-lg" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="font-roboto text-2xl font-bold text-white lg:text-[#1a1a2e]">{profileName}</h2>
            <p className="text-sm text-[#6b7280] lg:text-gray-500 font-roboto">{profileEmail}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${
                profileRole === 'super_admin' ? 'bg-golden/10 text-golden' :
                profileRole === 'admin' ? 'bg-primary/10 text-primary' :
                profileRole === 'editor' ? 'bg-accent/10 text-accent' :
                'bg-[#002349]/10 text-[#002349]'
              }`}>
                {profileRole}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${
                profileStatus === 'active' ? 'bg-[#e6f4ea] text-[#088135]' : 'bg-[#fef2f2] text-[#dc2626]'
              }`}>
                {profileStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-roboto text-[#9ca3af] lg:text-gray-700 mb-1.5">
              Full Name
            </label>
            <input type="text" value={profileName} readOnly className="w-full px-4 py-3 border border-[#1c3a5e] lg:border-gray-200 bg-[#001731] lg:bg-white rounded-md text-sm font-roboto text-white lg:text-[#1a1a1a] focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-roboto text-[#9ca3af] lg:text-gray-700 mb-1.5">
              Email
            </label>
            <input type="text" value={profileEmail} readOnly className="w-full px-4 py-3 border border-[#1c3a5e] lg:border-gray-200 bg-[#001731] lg:bg-white rounded-md text-sm font-roboto text-white lg:text-[#1a1a1a] focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-roboto text-[#9ca3af] lg:text-gray-700 mb-1.5">
              Role
            </label>
            <input type="text" value={profileRole} readOnly className="w-full px-4 py-3 border border-[#1c3a5e] lg:border-gray-200 bg-[#001731] lg:bg-white rounded-md text-sm font-roboto text-white lg:text-[#1a1a1a] focus:outline-none transition-all capitalize" />
          </div>
          <div>
            <label className="block text-sm font-roboto text-[#9ca3af] lg:text-gray-700 mb-1.5">
              Phone
            </label>
            <input type="text" value={profilePhone || '—'} readOnly className="w-full px-4 py-3 border border-[#1c3a5e] lg:border-gray-200 bg-[#001731] lg:bg-white rounded-md text-sm font-roboto text-white lg:text-[#1a1a1a] focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-roboto text-[#9ca3af] lg:text-gray-700 mb-1.5">
              Member Since
            </label>
            <input type="text" value={joinedDate} readOnly className="w-full px-4 py-3 border border-[#1c3a5e] lg:border-gray-200 bg-[#001731] lg:bg-white rounded-md text-sm font-roboto text-white lg:text-[#1a1a1a] focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-roboto text-[#9ca3af] lg:text-gray-700 mb-1.5">
              Status
            </label>
            <input type="text" value={profileStatus} readOnly className={`w-full px-4 py-3 border border-[#1c3a5e] lg:border-gray-200 rounded-md text-sm font-roboto focus:outline-none transition-all capitalize ${
              profileStatus === 'active' ? 'bg-[#e6f4ea]/15 text-green-400 lg:bg-[#e6f4ea] lg:text-[#088135]' : 'bg-[#fef2f2]/15 text-red-400 lg:bg-[#fef2f2] lg:text-[#dc2626]'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
}