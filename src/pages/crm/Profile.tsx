import { UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#03002E] flex items-center justify-center">
            <span className="text-white text-xl font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div>
            <h2 className="font-jost text-lg text-[#1a1a2e]">{user?.name || 'Admin'}</h2>
            <p className="text-sm text-gray-500 font-roboto">{user?.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-roboto font-medium bg-gray-100 text-gray-600 mt-1">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider">Full Name</label>
              <input type="text" value={user?.name || ''} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto bg-gray-50" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider">Email</label>
              <input type="text" value={user?.email || ''} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto bg-gray-50" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider">Role</label>
              <input type="text" value={user?.role || ''} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto bg-gray-50" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider">Member Since</label>
              <input type="text" value={new Date().toLocaleDateString()} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto bg-gray-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}