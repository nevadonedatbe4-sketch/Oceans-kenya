import { useState, useEffect, useRef } from 'react';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { useAuth } from '@/hooks/useAuth';
import { useAppointmentSetters } from '@/hooks/useAppointmentSetters';
import CalendarAccessModal from '@/pages/admin/components/CalendarAccessModal';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  Pencil,
  Ban,
  CheckCircle,
  Trash2,
  X,
  Save,
  Loader2,
  Mail,
  UserPlus,
  Crown,
  ShieldAlert,
  BadgeCheck,
  KeyRound,
  CalendarCheck,
} from 'lucide-react';
import UserSecurityModal from '@/pages/admin/agent-access/UserSecurityModal';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  avatar: string | null;
  status: string;
  created_at: string;
}

const ROLES = ['super_admin', 'admin', 'editor', 'agent'] as const;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  agent: 'Agent',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  admin: 'bg-green-500/15 text-green-300 border-green-500/40',
  editor: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  agent: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
};

const ROLE_BG_GRADIENTS: Record<string, string> = {
  super_admin: 'from-amber-400/20 to-amber-500/5',
  admin: 'from-green-500/20 to-green-500/5',
  editor: 'from-emerald-400/20 to-emerald-500/5',
  agent: 'from-sky-400/20 to-sky-500/5',
};

const ROLE_INFO: Record<string, { label: string; desc: string; Key: any; perms: string[] }> = {
  super_admin: {
    label: 'Super Admin',
    desc: 'Full control of the platform — user roles, account controls, system & security settings.',
    Key: Crown,
    perms: ['Complete admin portal access', 'Create & edit roles and permissions', 'Invite, suspend & delete users', 'Manage system & security settings'],
  },
  admin: {
    label: 'Admin',
    desc: 'Manages the day-to-day operation of the portal — team, listings, leads, deals and content.',
    Key: ShieldCheck,
    perms: ['Team, listings, leads & deals management', 'Content and directory management', 'Approve & act on agent requests', 'Manage invitations'],
  },
  editor: {
    label: 'Editor',
    desc: 'Creates and maintains content across the site — listings, neighbourhoods, articles and guides.',
    Key: UserCog,
    perms: ['Create & edit listings and content', 'Manage neighbourhoods & amenities', 'Publish public content'],
  },
  agent: {
    label: 'Agent',
    desc: 'Agent Portal only — access to their own listings, leads, contacts, appointments and dashboard.',
    Key: Shield,
    perms: ['Own listings, leads & contacts', 'Agent dashboard & performance', 'Appointments & notifications', 'Team messaging'],
  },
};

export type UsersAccessTab = 'users' | 'roles' | 'invitations';

interface UsersAccessPanelProps {
  activeTab: UsersAccessTab;
}

export default function UsersAccessPanel({ activeTab }: UsersAccessPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [securityUser, setSecurityUser] = useState<UserProfile | null>(null);
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const perPage = 10;

  const { user: authUser } = useAuth();
  const { setterIds, isAppointmentSetter, setSetter, refresh: refreshSetters } = useAppointmentSetters();
  const [accessOpen, setAccessOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ user_id: string; name: string }[]>([]);
  const [togglingSetter, setTogglingSetter] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' });
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);
    if (error) {
      showToast('Failed to load users', 'error');
    } else {
      setUsers(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const fetchRoleCounts = async () => {
    const { data } = await supabase.from('profiles').select('role');
    if (!data) return;
    const map: Record<string, number> = {};
    data.forEach((p) => {
      if (p.role) map[p.role] = (map[p.role] || 0) + 1;
    });
    setRoleCounts(map);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.from('profiles').select('user_id, name, email');
    if (data) setAllUsers(data.map((p) => ({ user_id: p.user_id, name: p.name || p.email })));
  };

  useEffect(() => {
    fetchUsers();
    fetchRoleCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useEffect(() => {
    void fetchAllUsers();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: editUser.name,
        role: editUser.role,
        phone: editUser.phone,
        status: editUser.status,
      })
      .eq('id', editUser.id);
    if (error) {
      showToast(error.message || 'Failed to update user', 'error');
    } else {
      showToast('User updated', 'success');
      setEditUser(null);
      fetchUsers();
      fetchRoleCounts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      showToast(error.message || 'Failed to delete user', 'error');
    } else {
      showToast('User deleted', 'success');
      setDeleteId(null);
      fetchUsers();
      fetchRoleCounts();
    }
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: suspend ? 'suspended' : 'active' })
      .eq('id', id);
    if (error) {
      showToast(error.message || 'Failed to update status', 'error');
    } else {
      showToast(suspend ? 'User suspended' : 'User reactivated', 'success');
      setSuspendId(null);
      fetchUsers();
      fetchRoleCounts();
    }
  };

  const toggleSetter = async (u: UserProfile) => {
    setTogglingSetter(u.user_id);
    const next = !isAppointmentSetter(u.user_id);
    try {
      await setSetter(u.user_id, next, authUser?.id ?? null);
      showToast(
        next ? `${u.name || u.email} is now an Appointment Setter` : 'Appointment Setter access removed',
        'success',
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to update access', 'error');
    } finally {
      setTogglingSetter(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setInviteSuccess(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      showToast('You must be logged in to invite users', 'error');
      setInviting(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: inviteEmail,
            role: inviteRole,
            name: inviteEmail.split('@')[0],
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.error || 'Failed to create user', 'error');
      } else {
        setInviteSuccess(true);
        showToast(data?.message || 'User created successfully', 'success');
        setInviteEmail('');
        setInviteRole('agent');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error. Please try again.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!editUser) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${editUser.user_id}-${Date.now()}.${ext}`;

      const { url } = await uploadImageViaEdgeFunction(file, path, 'agent-avatars');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: url })
        .eq('id', editUser.id);

      if (updateError) {
        showToast(`Failed to save avatar: ${updateError.message}`, 'error');
      } else {
        setEditUser({ ...editUser, avatar: url });
        showToast('Avatar updated', 'success');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown size={16} />;
      case 'admin': return <ShieldCheck size={16} />;
      case 'editor': return <UserCog size={16} />;
      case 'agent': return <Shield size={16} />;
      default: return <Shield size={16} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <>
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white placeholder:text-white/20 focus:outline-none focus:border-teal/40 focus:bg-white/[0.06] transition-all"
              />
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="bg-[#102a4f] rounded-xl border border-white/[0.07] py-20 text-center">
              <div className="w-10 h-10 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-white/30 font-roboto">Loading team members...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-[#102a4f] rounded-xl border border-white/[0.07] py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-white/15" />
              </div>
              <p className="text-base font-jost font-semibold text-white/50 mb-1">No users found</p>
              <p className="text-sm text-white/25 font-roboto">Try adjusting your search or invite someone new.</p>
            </div>
          ) : (
            <div className="bg-[#102a4f] rounded-xl border border-white/[0.07] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      <th className="px-6 py-4 text-left text-xs font-roboto text-white/25 uppercase tracking-[0.15em] font-semibold">Team Member</th>
                      <th className="px-6 py-4 text-left text-xs font-roboto text-white/25 uppercase tracking-[0.15em] font-semibold hidden md:table-cell">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-roboto text-white/25 uppercase tracking-[0.15em] font-semibold">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-roboto text-white/25 uppercase tracking-[0.15em] font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-roboto text-white/25 uppercase tracking-[0.15em] font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 ring-1 ring-white/[0.06] ${user.avatar ? '' : `bg-gradient-to-br ${ROLE_BG_GRADIENTS[user.role] || 'from-white/10 to-white/[0.02]'}`}`}>
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name || ''} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white text-base font-bold font-jost">
                                  {(user.name || user.email).charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-roboto font-semibold text-white truncate">
                                {user.name || 'Unnamed'}
                              </p>
                              <p className="text-xs text-white/30 font-roboto truncate mt-0.5">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="text-sm text-white/35 font-roboto">{user.phone || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-roboto font-bold uppercase border ${ROLE_COLORS[user.role] || 'bg-white/5 text-white/40 border-white/10'}`}>
                              {getRoleIcon(user.role)}
                              {ROLE_LABELS[user.role] || user.role}
                            </span>
                            {isAppointmentSetter(user.user_id) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-roboto font-bold uppercase tracking-wide bg-teal/15 text-teal border border-teal/30">
                                <CalendarCheck size={11} />
                                Appointment Setter
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-roboto font-bold uppercase ${
                            user.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : user.status === 'suspended'
                              ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                              : 'bg-white/5 text-white/30 border border-white/10'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-400' : user.status === 'suspended' ? 'bg-red-400' : 'bg-white/20'}`} />
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleSetter(user)}
                              disabled={togglingSetter === user.user_id}
                              className={`p-2 rounded-lg cursor-pointer transition-all disabled:opacity-40 ${
                                isAppointmentSetter(user.user_id)
                                  ? 'text-teal bg-teal/10 hover:bg-teal/20'
                                  : 'text-white/25 hover:bg-white/[0.06] hover:text-teal'
                              }`}
                              title={isAppointmentSetter(user.user_id) ? 'Remove Appointment Setter access' : 'Designate as Appointment Setter'}
                            >
                              {togglingSetter === user.user_id ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
                            </button>
                            <button
                              onClick={() => setEditUser(user)}
                              className="p-2 hover:bg-white/[0.06] rounded-lg cursor-pointer text-white/25 hover:text-teal transition-all"
                              title="Edit user"
                            >
                              <Pencil size={16} />
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => setSuspendId(user.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg cursor-pointer text-white/25 hover:text-red-400 transition-all"
                                title="Suspend user"
                              >
                                <Ban size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspend(user.id, false)}
                                className="p-2 hover:bg-emerald-500/10 rounded-lg cursor-pointer text-white/25 hover:text-emerald-400 transition-all"
                                title="Reactivate user"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => setSecurityUser(user)}
                              className="p-2 hover:bg-white/[0.06] rounded-lg cursor-pointer text-white/25 hover:text-teal transition-all"
                              title="Security & password"
                            >
                              <KeyRound size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(user.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg cursor-pointer text-white/25 hover:text-red-400 transition-all"
                              title="Delete user"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-white/[0.05] px-4 py-3">
                <CRMPagination
                  page={page}
                  totalPages={Math.ceil(totalCount / perPage)}
                  total={totalCount}
                  pageSize={perPage}
                  onPageChange={setPage}
                  tone="light"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ROLES & PERMISSIONS TAB ── */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROLES.map((role) => {
            const info = ROLE_INFO[role];
            const count = roleCounts[role] || 0;
            return (
              <div key={role} className="bg-[#102a4f] rounded-xl border border-white/[0.07] p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal/15 flex items-center justify-center">
                      <info.Key size={20} className="text-teal" />
                    </div>
                    <div>
                      <p className="font-jost font-bold text-white">{info.label}</p>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-roboto font-bold uppercase border ${ROLE_COLORS[role] || 'bg-white/5 text-white/40 border-white/10'}`}>
                        {getRoleIcon(role)}
                        {count} user{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <BadgeCheck size={18} className="text-white/20" />
                </div>
                <p className="text-sm text-white/50 font-roboto leading-relaxed mb-4">{info.desc}</p>
                <div className="mt-auto space-y-2">
                  {info.perms.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-sm text-white/70 font-roboto">
                      <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Appointment Setter — a granted scheduling capability, not a login role */}
          <div className="bg-[#102a4f] rounded-xl border border-teal/25 p-6 flex flex-col sm:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal/15 flex items-center justify-center">
                  <CalendarCheck size={20} className="text-teal" />
                </div>
                <div>
                  <p className="font-jost font-bold text-white">Appointment Setter</p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-roboto font-bold uppercase border bg-teal/15 text-teal border-teal/30">
                    <CalendarCheck size={12} />
                    {setterIds.length} appointed
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAccessOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal hover:bg-teal/90 text-[#001731] text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                <CalendarCheck size={16} />
                Manage appointment setters
              </button>
            </div>
            <p className="text-sm text-white/50 font-roboto leading-relaxed mt-4">
              A per-account scheduling capability — not a separate login role. An appointment setter
              manages the Company Calendar, creates and assigns appointments for any agent, sees every
              agent&apos;s availability, and reschedules or cancels anyone&apos;s appointments. All other
              access stays limited to their own records.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm text-white/70 font-roboto">
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                Manage the Company Calendar
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70 font-roboto">
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                Create &amp; assign appointments for any agent
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70 font-roboto">
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                See every agent&apos;s availability
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70 font-roboto">
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                Reschedule or cancel anyone&apos;s appointments
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INVITATIONS & ACCESS TAB ── */}
      {activeTab === 'invitations' && (
        <div className="space-y-5">
          <div className="bg-[#102a4f] rounded-xl border border-white/[0.07] p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
                <UserPlus size={16} className="text-teal" />
              </div>
              <h3 className="font-jost text-base font-semibold text-white">Invite New Team Member</h3>
            </div>

            {inviteSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-5 py-4 mb-5">
                <p className="text-sm font-roboto text-emerald-300 font-semibold mb-1">Account created successfully</p>
                <p className="text-sm font-roboto text-emerald-300/70">
                  They can sign in at <strong className="text-emerald-200">/admin/login</strong> and use <strong className="text-emerald-200">Forgot password?</strong> to set their password.
                </p>
              </div>
            )}

            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-roboto text-white/40 uppercase tracking-[0.15em] mb-2 font-semibold">
                  <Mail size={12} className="inline mr-1.5" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white placeholder:text-white/20 focus:outline-none focus:border-teal/40 focus:bg-white/[0.06] transition-all"
                  placeholder="colleague@agency.com"
                />
              </div>
              <div className="w-full sm:w-44">
                <label className="block text-xs font-roboto text-white/40 uppercase tracking-[0.15em] mb-2 font-semibold">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white focus:outline-none focus:border-teal/40 focus:bg-white/[0.06] transition-all cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="bg-[#102a4f] text-white">{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="w-full sm:w-auto bg-teal hover:bg-teal/90 text-[#001731] px-7 py-3 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 tracking-wide"
              >
                {inviting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Sending Invite...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail size={16} />
                    Send Invite
                  </span>
                )}
              </button>
            </form>
          </div>

          <div className="bg-[#102a4f] rounded-xl border border-white/[0.07] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
                <ShieldAlert size={16} className="text-teal" />
              </div>
              <h3 className="font-jost text-base font-semibold text-white">Access Notes</h3>
            </div>
            <ul className="space-y-2 text-sm font-roboto text-white/60">
              <li className="flex items-start gap-2">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                Invitations create a user account with the chosen role, then the invitee sets their own password via the reset flow.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                Admins &amp; Super Admins get full Admin Portal access; Agents are gated to the Agent Portal pending approval.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                You can edit a user's role or status from the <strong className="text-white">Users</strong> tab at any time.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001731]/80 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div className="relative bg-[#102a4f] rounded-2xl w-full max-w-lg border border-white/[0.08] shadow-2xl shadow-[#001731]/50">
            <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
                  <Pencil size={17} className="text-teal" />
                </div>
                <h2 className="font-jost text-lg font-bold text-white">Edit Team Member</h2>
              </div>
              <button onClick={() => setEditUser(null)} className="p-2 hover:bg-white/[0.06] rounded-lg cursor-pointer text-white/30 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-7 space-y-5">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 pb-5 border-b border-white/[0.06]">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all ring-2 ring-offset-2 ring-offset-[#102a4f] ring-transparent hover:ring-teal/50 bg-white/[0.06]"
                    title="Click to change avatar"
                  >
                    {uploadingAvatar ? (
                      <Loader2 size={20} className="animate-spin text-white/60" />
                    ) : editUser.avatar ? (
                      <img src={editUser.avatar} alt={editUser.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xl font-bold font-jost">
                        {(editUser.name || editUser.email).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className={`absolute inset-0 rounded-xl flex items-center justify-center bg-[#102a4f]/80 transition-opacity cursor-pointer ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <i className="ri-camera-line text-white text-lg" />
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-roboto font-semibold text-white">{editUser.name || 'Unnamed'}</p>
                  <p className="text-xs text-white/40 font-roboto mt-0.5">Click the avatar to upload a photo</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto text-white/40 uppercase tracking-[0.15em] mb-2 font-semibold">Full Name</label>
                <input
                  type="text"
                  value={editUser.name || ''}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white focus:outline-none focus:border-teal/40 focus:bg-white/[0.06] transition-all"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-white/40 uppercase tracking-[0.15em] mb-2 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={editUser.email}
                  disabled
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-lg text-sm font-roboto text-white/30 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-roboto text-white/40 uppercase tracking-[0.15em] mb-2 font-semibold">Role</label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white focus:outline-none focus:border-teal/40 focus:bg-white/[0.06] transition-all cursor-pointer appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-[#102a4f] text-white">{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-roboto text-white/40 uppercase tracking-[0.15em] mb-2 font-semibold">Status</label>
                  <select
                    value={editUser.status}
                    onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white focus:outline-none focus:border-teal/40 focus:bg-white/[0.06] transition-all cursor-pointer appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                  >
                    <option value="active" className="bg-[#102a4f] text-white">Active</option>
                    <option value="suspended" className="bg-[#102a4f] text-white">Suspended</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto text-white/40 uppercase tracking-[0.15em] mb-2 font-semibold">Phone Number</label>
                <input
                  type="text"
                  value={editUser.phone || ''}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white focus:outline-none focus:border-teal/40 focus:bg-white/[0.06] transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="flex items-center gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 px-5 py-3 border border-white/[0.08] rounded-lg text-sm font-roboto font-semibold text-white/50 hover:bg-white/[0.04] hover:text-white/70 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-teal hover:bg-teal/90 text-[#001731] rounded-lg text-sm font-roboto font-bold cursor-pointer disabled:opacity-40 transition-all"
                >
                  {saving ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <Save size={16} />
                      Save Changes
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm modals */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete User"
        message="This will permanently delete the user profile. Their auth account may remain. Continue?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Delete"
        confirmVariant="danger"
      />

      <ConfirmModal
        isOpen={!!suspendId}
        title="Suspend User"
        message="This user will no longer be able to access the dashboard. Are you sure?"
        onConfirm={() => suspendId && handleSuspend(suspendId, true)}
        onCancel={() => setSuspendId(null)}
        confirmLabel="Suspend"
        confirmVariant="danger"
      />

      {securityUser && (
        <UserSecurityModal
          user={securityUser}
          onClose={() => setSecurityUser(null)}
          onDone={() => {
            fetchUsers();
            fetchRoleCounts();
          }}
        />
      )}

      <CalendarAccessModal
        open={accessOpen}
        onClose={() => { setAccessOpen(false); void refreshSetters(); }}
        agents={allUsers}
      />
    </div>
  );
}