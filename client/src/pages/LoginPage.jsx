import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Activity, User, Stethoscope, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function LoginPage() {
  const [roleTab, setRoleTab] = useState('patient'); // 'patient' | 'doctor'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectParam = new URLSearchParams(location.search).get('redirect');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login({
        email: email.trim(),
        password
      });

      loginUser(res.access_token, res.user, res.user.doctor);

      if (redirectParam) {
        navigate(redirectParam);
      } else if (res.user.role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Activity className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to Care Connect</h1>
        <p className="text-xs text-slate-500">Access your live digital queue tracker or manage your clinical practice.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 text-xs">
        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRoleTab('patient')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              roleTab === 'patient'
                ? 'bg-white text-teal-800 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('doctor')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              roleTab === 'doctor'
                ? 'bg-white text-teal-800 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={roleTab === 'doctor' ? 'doctor@example.com' : 'patient@example.com'}
            required
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl transition-all shadow-md text-xs sm:text-sm disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-center text-[11px]">
          <p className="text-slate-500">
            Need a patient account?{' '}
            <Link to={`/patient/signup${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`} className="text-teal-700 font-bold hover:underline">
              Create Patient Account
            </Link>
          </p>
          <p className="text-slate-500">
            Healthcare provider?{' '}
            <Link to="/doctor/register" className="text-teal-700 font-bold hover:underline">
              Join as Doctor
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

