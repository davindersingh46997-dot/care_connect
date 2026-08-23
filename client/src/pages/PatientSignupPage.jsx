import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Calendar,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function PatientSignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useAuth();

  const redirectUrl = new URLSearchParams(location.search).get('redirect') || '/patient/dashboard';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    latitude: '',
    longitude: ''
  });

  const [locating, setLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'age' ? (value ? Number(value) : '') : value
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        }));
        setLocating(false);
        setLocationSuccess(true);
        setTimeout(() => setLocationSuccess(false), 3000);
      },
      (err) => {
        setLocating(false);
        setError('Location access was not granted. You can still register without GPS coordinates.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        age: formData.age ? Number(formData.age) : null,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null
      };

      const res = await api.auth.registerPatient(payload);
      loginUser(res.access_token, res.user);
      navigate(redirectUrl);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Activity className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Create Patient Account
        </h1>
        <p className="text-xs text-slate-500">
          Sign up to join clinic queues, track tokens live, and access healthcare history.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 text-xs">
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Jashandeep Singh"
            required
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Age (Optional)</label>
          <input
            type="number"
            name="age"
            min="1"
            max="120"
            value={formData.age}
            onChange={handleChange}
            placeholder="e.g. 26"
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        {/* Location Option */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              Location for Nearby Doctors
            </span>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <Navigation className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : 'Use My Location'}</span>
            </button>
          </div>

          {locationSuccess && (
            <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Coordinates saved ({formData.latitude}, {formData.longitude})
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50 text-xs sm:text-sm"
        >
          {loading ? 'Creating Account...' : 'Sign Up as Patient'}
        </button>

        <p className="text-[11px] text-center text-slate-500 pt-2">
          Already have an account?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className="text-teal-700 font-bold hover:underline">
            Sign In
          </Link>
        </p>

        <div className="pt-2 border-t border-slate-100 text-center">
          <Link to="/doctor/register" className="text-[11px] text-slate-600 hover:text-teal-700 font-semibold">
            Are you a healthcare provider? <span className="text-teal-700 underline">Join as Doctor</span>
          </Link>
        </div>
      </form>
    </div>
  );
}
