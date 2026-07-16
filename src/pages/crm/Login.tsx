import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function CRMLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signIn } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/crm/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message || 'Invalid credentials');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <img
                src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058"
                alt="Oceans"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-1">Admin Portal</h1>
            <p className="text-sm text-gray-500 font-roboto">Sign in to manage your real estate business</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="admin@oceans.co.ke"
              />
            </div>

            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all pr-10"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-md text-sm font-roboto tracking-wide uppercase transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6 font-roboto">
            Oceans Kenya Real Estate CRM
          </p>
        </div>
      </div>
    </div>
  );
}