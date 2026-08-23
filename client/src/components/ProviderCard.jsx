import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Star,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

export default function ProviderCard({ doctor, isTopMatch = false }) {
  const { user, isAuthenticated, isPatient } = useAuth();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  const clinicStatus = doctor.clinic_status || doctor.status?.toUpperCase();
  const isClinicOpen = clinicStatus === 'OPEN' || doctor.is_open === true || doctor.is_accepting === true;
  const isClinicPaused = clinicStatus === 'PAUSED';

  const handleJoinQueue = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/doctors/${doctor.id}`)}`);
      return;
    }

    if (!isPatient) {
      setJoinError('Doctor accounts cannot join patient queues.');
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      await api.queue.join({ doctor_id: doctor.id });

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (_) {}

      navigate('/patient/queue');
    } catch (err) {
      setJoinError(err.message || 'Failed to join queue.');
    } finally {
      setJoining(false);
    }
  };

  const getStatusBadge = () => {
    if (clinicStatus === 'OPEN' || doctor.is_open || doctor.is_accepting) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Open — Accepting Patients
        </span>
      );
    }
    if (clinicStatus === 'PAUSED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Queue Temporarily Paused
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        Clinic Closed
      </span>
    );
  };

  return (
    <div
      className={`relative bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg ${
        isTopMatch
          ? 'border-teal-400/90 shadow-md ring-1 ring-teal-300/50 bg-gradient-to-b from-teal-50/20 to-white'
          : 'border-slate-200/90 shadow-xs hover:border-slate-300'
      }`}
    >
      {/* Top Match Badge */}
      {isTopMatch && (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-600 text-white text-[11px] font-bold shadow-xs tracking-wide">
          <Sparkles className="w-3 h-3 text-teal-200" />
          TOP RECOMMENDED
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Doctor Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-black text-xl shadow-inner">
            {doctor.name ? doctor.name.replace(/^Dr\.\s*/i, '').charAt(0) : 'D'}
          </div>
        </div>

        {/* Doctor Main Info */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 hover:text-teal-700 transition-colors">
                  <Link to={`/doctors/${doctor.id}`}>{doctor.name}</Link>
                </h3>
                <span title="Certified Medical Practitioner">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                </span>
              </div>
              <p className="text-xs font-semibold text-teal-700">
                {doctor.specialty} {doctor.qualification ? `• ${doctor.qualification}` : ''}
              </p>
            </div>

            {/* Consultation Fee */}
            <div className="text-right">
              <span className="text-base font-extrabold text-slate-900">₹{doctor.fee ?? doctor.consultation_fee ?? 0}</span>
              <span className="text-[10px] text-slate-500 block -mt-0.5">consultation fee</span>
            </div>
          </div>

          {/* Sub details: Rating, Experience, Distance */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {doctor.rating ? Number(doctor.rating).toFixed(1) : '5.0'}
              <span className="text-slate-400 font-normal">({doctor.reviews_count || 0} reviews)</span>
            </span>

            <span>•</span>
            <span className="font-medium">{doctor.experience || 0} yrs experience</span>

            {doctor.distance_km !== undefined && doctor.distance_km !== null && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  {Number(doctor.distance_km).toFixed(1)} km away
                </span>
              </>
            )}
          </div>

          <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <strong className="text-slate-800">{doctor.clinic_name}</strong>
            <span className="text-slate-400 truncate">— {doctor.address || doctor.clinic_address}</span>
          </p>

          {/* Real-time Status Card */}
          <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-600">
                Waiting in line: <strong className="text-slate-900">{doctor.waiting_count ?? doctor.waiting_queue_count ?? 0}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-100/70 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-teal-700" />
              Est. wait: ~{doctor.estimated_wait_mins || (doctor.waiting_count ? doctor.waiting_count * 15 : 0)} min
            </div>
          </div>

          {joinError && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          {/* Action CTAs */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <Link
              to={`/doctors/${doctor.id}`}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              View Profile & Reviews
            </Link>

            <button
              onClick={handleJoinQueue}
              disabled={joining || !isClinicOpen}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${
                isClinicOpen
                  ? 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-500/20 active:scale-95'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {joining ? (
                <span>Joining Queue...</span>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isAuthenticated ? 'Join Digital Queue' : 'Sign In to Join Queue'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
