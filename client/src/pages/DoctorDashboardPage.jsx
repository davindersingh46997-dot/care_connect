import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  Stethoscope,
  Power,
  ArrowRight,
  TrendingUp,
  Settings,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DoctorDashboardPage() {
  const { user, doctorInfo, isDoctor, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const fetchDoctorData = async () => {
    try {
      const res = await api.queue.getDoctorQueue();
      setQueueData(res);
    } catch (err) {
      console.warn('Error fetching doctor live queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login?redirect=/doctor/dashboard');
      return;
    }
    if (isAuthenticated && !isDoctor) {
      navigate('/patient/dashboard');
      return;
    }

    fetchDoctorData();
    const interval = setInterval(fetchDoctorData, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isDoctor]);

  const handleUpdateStatus = async (newStatus) => {
    const docId = queueData?.doctor?.id || doctorInfo?.id;
    if (!docId) return;

    setTogglingStatus(true);
    setStatusError(null);

    try {
      await api.doctors.updateStatus(docId, newStatus);
      setStatusMsg(`Clinic status set to ${newStatus}`);
      await fetchDoctorData();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusError(err.message || 'Failed to update clinic status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading Doctor Dashboard...</p>
      </div>
    );
  }

  const doctor = queueData?.doctor || doctorInfo;
  const overview = queueData?.overview || {};
  const currentStatus = doctor?.clinic_status || 'CLOSED';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {statusError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {/* Header with Greeting & Clinic Status Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Healthcare Provider Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Welcome, {user?.name || doctor?.name || 'Doctor'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {doctor?.specialty} • {doctor?.clinic_name}
          </p>
        </div>

        {/* Status Selector: OPEN | PAUSED | CLOSED */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-700 px-2">Clinic Status:</span>
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => handleUpdateStatus('OPEN')}
              disabled={togglingStatus}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentStatus === 'OPEN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🟢 OPEN
            </button>
            <button
              onClick={() => handleUpdateStatus('PAUSED')}
              disabled={togglingStatus}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentStatus === 'PAUSED'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🟡 PAUSED
            </button>
            <button
              onClick={() => handleUpdateStatus('CLOSED')}
              disabled={togglingStatus}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentStatus === 'CLOSED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🔴 CLOSED
            </button>
          </div>
        </div>
      </div>

      {/* Today's Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Patients Today
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {overview.total_patients_today ?? 0}
          </div>
          <span className="text-[10px] text-teal-600 font-medium">Daily Clinic Traffic</span>
        </div>

        {/* Completed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Completed
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {overview.completed_count ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Finished Consultations</span>
        </div>

        {/* Waiting */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Waiting in Queue
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {overview.waiting_count ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">In Queue Line</span>
        </div>

        {/* Current Token */}
        <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-2xs space-y-1 bg-teal-50/20">
          <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">
            Current Token
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-900">
            #{overview.current_token ?? '-'}
          </div>
          <span className="text-[10px] text-teal-700 font-medium">Inside Doctor Room</span>
        </div>

        {/* Est Wait Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Queue Wait
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            ~{overview.estimated_wait_minutes ?? (overview.waiting_count ? overview.waiting_count * 15 : 0)}m
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Avg Patient Wait</span>
        </div>
      </div>

      {/* Main Interactive Action Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
            <Stethoscope className="w-3.5 h-3.5" />
            Live Queue Desk
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Manage your patient flow in real-time.
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Call the next token, mark consultations completed, or skip absent patients. Patients receive immediate live queue notifications on their devices.
          </p>
        </div>

        <Link
          to="/doctor/queue"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all shrink-0"
        >
          <span>Open Live Queue Manager</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Secondary Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Clinic Profile & Fees
            </h3>
            <Link to="/doctor/profile" className="text-xs text-teal-700 font-semibold hover:underline">
              Edit Settings
            </Link>
          </div>
          <div className="text-xs text-slate-600 space-y-2">
            <p><strong>Fee:</strong> ₹{doctor?.fee ?? 400} per consultation</p>
            <p><strong>Clinic Hours:</strong> {doctor?.working_hours || '09:00 AM - 06:00 PM'}</p>
            <p><strong>Location:</strong> {doctor?.address || 'Your Registered Clinic Address'}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Clinic Queue Summary
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Estimated consultation duration: <strong>15 minutes per patient</strong>. Digital queues have eliminated waiting room congestion.
          </p>
          <div className="pt-1">
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              ✓ Status: {currentStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

