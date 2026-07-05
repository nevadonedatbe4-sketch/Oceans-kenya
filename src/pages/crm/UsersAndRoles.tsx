import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Pencil,
  Ban,
  CheckCircle,
  Trash2,
  X,
  Save,
  Loader2,
  Mail,
} from 'lucide-react';

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
  super_admin: 'bg-purple-50 text-purple-700',
  admin: 'bg-blue-50 text-blue-700',
  editor: 'bg-green-50 text-green-700',
  agent: 'bg-amber-50 text-amber-700',
};

export default function UsersAndRoles() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviting, setInviting] = useState(false);
  const perPage = 10;

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

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

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
      showToast('Failed to update user', 'error');
    } else {
      showToast('User updated', 'success');
      setEditUser(null);
      fetchUsers();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete user', 'error');
    } else {
      showToast('User deleted', 'success');
      setDeleteId(null);
      fetchUsers();
    }
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: suspend ? 'suspended' : 'active' })
      .eq('id', id);
    if (error) {
      showToast('Failed to update status', 'error');
    } else {
      showToast(suspend ? 'User suspended' : 'User reactivated', 'success');
      setSuspendId(null);
      fetchUsers();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    // Create a new auth user and profile
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteEmail,
      password: Math.random().toString(36).substring(2, 10) + 'A1!',
    });
    if (authError || !authData.user) {
      showToast('Failed to send invite', 'error');
      setInviting(false);
      return;
    }
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      email: inviteEmail,
      role: inviteRole,
      name: inviteEmail.split('@')[0],
      status: 'active',
    });
    if (profileError) {
      showToast('Failed to create profile', 'error');
    } else {
      showToast('Invite sent successfully', 'success');
      setInviteEmail('');
      setInviteRole('agent');
      fetchUsers();
    }
    setInviting(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <ShieldCheck size={14} />;
      case 'admin': return <Shield size={14} />;
      case 'editor': return <UserCog size={14} />;
      default: return <ShieldAlert size={14} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Users & Roles</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">Manage user access and permissions</p>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <h3 className="font-jost text-sm text-[#1a1a2e] mb-3">Invite New User</h3>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
              <Mail size={12} className="inline mr-1" />
              Email
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
              placeholder="user@example.com"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {inviting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Inviting...
              </span>
            ) : (
              'Send Invite'
            )}
          </button>
        </form>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 py-16 text-center">
          <Users size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 font-roboto">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-sm font-semibold">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-roboto font-medium text-[#1a1a2e] truncate">
                            {user.name || 'Unnamed'}
                          </p>
                          <p className="text-xs text-gray-400 font-roboto truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 font-roboto">{user.phone || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${ROLE_COLORS[user.role] || 'bg-gray-50 text-gray-700'}`}>
                        {getRoleIcon(user.role)}
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${
                        user.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : user.status === 'suspended'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditUser(user)}
                          className="p-1.5 hover:bg-gray-100 rounded-md cursor-pointer text-gray-400 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => setSuspendId(user.id)}
                            className="p-1.5 hover:bg-red-50 rounded-md cursor-pointer text-gray-400 hover:text-red-600 transition-colors"
                            title="Suspend"
                          >
                            <Ban size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(user.id, false)}
                            className="p-1.5 hover:bg-green-50 rounded-md cursor-pointer text-gray-400 hover:text-green-600 transition-colors"
                            title="Reactivate"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(user.id)}
                          className="p-1.5 hover:bg-red-50 rounded-md cursor-pointer text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CRMPagination
            page={page}
            totalPages={Math.ceil(totalCount / perPage)}
            total={totalCount}
            pageSize={perPage}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditUser(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-jost text-lg text-[#1a1a2e]">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={editUser.name || ''}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto bg-gray-50 text-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={editUser.status}
                    onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="text"
                  value={editUser.phone || ''}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-md text-sm font-roboto text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-roboto cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <Save size={14} />
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
    </div>
  );
}