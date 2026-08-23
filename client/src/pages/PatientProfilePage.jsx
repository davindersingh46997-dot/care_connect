import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Edit2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function PatientProfilePage() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [activeQueue, setActiveQueue] = useState(null);
  const [pastVisits, setPastVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState(null);
  const [updateError, setUpdateError] = useState(null);

  const fetchProfileAndQueue = async () => {
    try {
      const profile = await api.patients.getProfile();
      setName(profile.name || '');
      setAge(profile.age || '');
      setPhone(profile.phone || '');
      setLocationStr(profile.location || '');

      const queueRes = await api.queue.getPatientQueue();
      if (queueRes.has_active_queue) {
        setActiveQueue(queueRes.active_queue);
      } else {
        setActiveQueue(null);
      }
      setPastVisits(queueRes.recent_visits || []);
    } catch (err) {
      console.warn('Error loading patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login?redirect=/patient/profile');
      return;
    }
    fetchProfileAndQueue();
  }, [isAuthenticated]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateError(null);
    setUpdateMsg(null);

    try {
      await api.patients.updateProfile({
        name: name.trim(),
        age: age ? Number(age) : null,
        phone: phone.trim(),
        location: locationStr.trim()
      });

      await refreshUser();
      setUpdateMsg('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setUpdateMsg(null), 3000);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-600">Loading patient profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {updateMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{updateMsg}</span>
        </div>
      )}

      {updateError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
            {user?.name ? user.name[0] : 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{user?.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                Verified Patient
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </span>
              {phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {phone}
                  </span>
                </>
              )}
              {age && (
                <>
                  <span>•</span>
                  <span>{age} years old</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
          <Link
            to="/doctors"
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
          >
            Find a Doctor
          </Link>
        </div>
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 text-xs animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Edit Patient Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Age</label>
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Location / City Area</label>
              <input
                type="text"
                value={locationStr}
                onChange={(e) => setLocationStr(e.target.value)}
                placeholder="e.g. Indiranagar, Bengaluru"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold disabled:opacity-50 shadow-xs"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Active Queue Section */}
      {activeQueue && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <Clock className="w-3.5 h-3.5" />
              Current Active Queue
            </span>
            <Link
              to="/patient/queue"
              className="text-xs font-semibold text-teal-300 hover:text-white underline"
            >
              Open Live Tracker →
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div>
              <h3 className="text-lg font-bold">{activeQueue.doctor_name}</h3>
              <p className="text-xs text-slate-300">{activeQueue.doctor_specialty} • {activeQueue.clinic_name}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">Your Token</span>
                <span className="text-2xl font-black text-teal-400">#{activeQueue.token_number}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">Current Serving</span>
                <span className="text-2xl font-black text-white">#{activeQueue.current_token_in_consultation || '-'}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">Est Wait</span>
                <span className="text-2xl font-black text-amber-300">~{activeQueue.estimated_wait_mins}m</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Visits Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          Recent Consultations & Queue History
        </h3>

        {pastVisits.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            No completed consultation records found. Your completed clinic appointments will be recorded here.
          </p>
        ) : (
          <div className="space-y-3">
            {pastVisits.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{v.doctor_name}</h4>
                  <p className="text-[11px] text-slate-500">{v.doctor_specialty} • {v.clinic_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Token #{v.token_number} • {v.created_at?.slice(0, 10)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

