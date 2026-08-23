import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  UserCheck,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SafetyDisclaimer from '../components/SafetyDisclaimer';
import confetti from 'canvas-confetti';

export default function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isPatient } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [joinSuccess, setJoinSuccess] = useState(null);

  const fetchDoctorData = async () => {
    try {
      const docRes = await api.doctors.getById(id);
      setDoctor(docRes);
      setReviews(docRes.reviews || []);

      try {
        const revRes = await api.doctors.getReviews(id);
        if (revRes.reviews) setReviews(revRes.reviews);
      } catch (_) {
        // Reviews optional or empty
      }
    } catch (err) {
      setError(err.message || 'Doctor not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    const interval = setInterval(fetchDoctorData, 5000); // Live poll queue state
    return () => {
      clearInterval(interval);
    };
  }, [id]);

  const clinicStatus = doctor?.clinic_status || doctor?.status?.toUpperCase();
  const isClinicOpen = clinicStatus === 'OPEN' || doctor?.is_open === true || doctor?.is_accepting === true;
  const isClinicPaused = clinicStatus === 'PAUSED';

  const handleJoinQueue = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/doctors/${doctor.id}`)}`);
      return;
    }

    if (!isPatient) {
      setError('Doctor accounts cannot join patient queues.');
      return;
    }

    setJoining(true);
    setJoinSuccess(null);
    setError(null);

    try {
      const res = await api.queue.join({
        doctor_id: doctor.id
      });

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_) {}

      setJoinSuccess(res);
      setTimeout(() => {
        navigate('/patient/queue');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Could not join queue.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-600">Loading doctor profile & real-time queue status...</p>
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Doctor Profile Not Found</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Doctor Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Search Results
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Doctor Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-teal-50 text-teal-700 border-2 border-teal-200 flex items-center justify-center font-black text-3xl shadow-inner">
              {doctor.name ? doctor.name.replace(/^Dr\.\s*/i, '').charAt(0) : 'D'}
            </div>
            <span
              className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border-2 border-white text-white ${
                isClinicOpen ? 'bg-emerald-500' : isClinicPaused ? 'bg-amber-500' : 'bg-slate-500'
              }`}
            >
              {isClinicOpen ? 'Open' : isClinicPaused ? 'Paused' : 'Closed'}
            </span>
          </div>

          {/* Profile Header Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {doctor.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Provider
                  </span>
                </div>
                <p className="text-sm font-bold text-teal-700">{doctor.specialty}</p>
                <p className="text-xs text-slate-500 font-medium">{doctor.qualification}</p>
              </div>

              {/* Fee badge */}
              <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-right">
                <span className="text-xl font-extrabold text-slate-900">₹{doctor.fee ?? doctor.consultation_fee ?? 0}</span>
                <span className="text-[10px] text-slate-500 block">Consultation fee</span>
              </div>
            </div>

            {/* Rating & Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {doctor.rating ? Number(doctor.rating).toFixed(1) : '5.0'}
                <span className="text-slate-400 font-normal">({doctor.reviews_count || reviews.length || 0} reviews)</span>
              </span>

              <span>•</span>
              <span className="font-semibold text-slate-700">{doctor.experience || 0} Years Experience</span>

              {doctor.working_hours && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {doctor.working_hours}
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-1">
              <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
              <strong>{doctor.clinic_name}</strong> — {doctor.address || doctor.clinic_address}
            </p>
          </div>
        </div>

        {/* Live Queue Action Card */}
        <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-teal-900 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 uppercase tracking-wide">
              <span className={`w-2 h-2 rounded-full ${isClinicOpen ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
              Live Clinic Queue Status
            </span>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
              <div>
                <span className="text-xs text-slate-300 block">Current Consulting Token</span>
                <span className="text-2xl font-black text-white">#{doctor.current_token || '-'}</span>
              </div>
              <div className="h-8 w-px bg-slate-700 hidden sm:block" />
              <div>
                <span className="text-xs text-slate-300 block">Patients Waiting</span>
                <span className="text-xl font-bold text-teal-200">{doctor.waiting_count || 0}</span>
              </div>
              <div className="h-8 w-px bg-slate-700 hidden sm:block" />
              <div>
                <span className="text-xs text-slate-300 block">Estimated Wait</span>
                <span className="text-xl font-bold text-amber-300">
                  ~{doctor.estimated_wait_mins || (doctor.waiting_count ? doctor.waiting_count * 15 : 0)} min
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {doctor.latitude && doctor.longitude ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Get Directions
              </a>
            ) : null}

            <button
              onClick={handleJoinQueue}
              disabled={joining || !isClinicOpen}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all ${
                isClinicOpen
                  ? 'bg-teal-400 hover:bg-teal-300 text-slate-950 active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-70'
              }`}
            >
              {joining ? (
                <span>Securing token...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {!isClinicOpen
                      ? isClinicPaused
                        ? 'Queue Paused'
                        : 'Clinic Closed'
                      : isAuthenticated
                      ? 'Join Live Queue'
                      : 'Sign In to Join Queue'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {joinSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>🎉 Token #{joinSuccess.token_number || joinSuccess.token} confirmed! Redirecting to live tracker...</span>
            <Link to="/patient/queue" className="underline font-bold">View Live Queue</Link>
          </div>
        )}
      </div>

      {/* Profile Detail Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bio & Reviews */}
        <div className="md:col-span-2 space-y-6">
          {/* Bio */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              About the Practitioner
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {doctor.bio ||
                doctor.profile_description ||
                'Certified medical practitioner dedicated to patient-first diagnosis, compassionate care, and personalized health strategies.'}
            </p>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                Verified Patient Reviews ({reviews.length})
              </h3>
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                No patient reviews yet. Reviews are submitted by patients after completed consultations.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{rev.patient_name}</span>
                      <span className="text-[10px] text-slate-400">{rev.created_at?.slice(0, 10) || 'Recent'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    {rev.comment && <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Clinic Info & Navigation Disclaimer */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Clinic Details
            </h3>

            <div className="space-y-3 text-slate-600">
              <div>
                <strong className="text-slate-900 block">Clinic Address:</strong>
                <p className="mt-0.5">{doctor.address || doctor.clinic_address}</p>
              </div>

              {doctor.working_hours && (
                <div>
                  <strong className="text-slate-900 block">Consultation Hours:</strong>
                  <p className="mt-0.5">{doctor.working_hours}</p>
                </div>
              )}

              <div>
                <strong className="text-slate-900 block">Registration Number:</strong>
                <p className="mt-0.5">{doctor.registration_number || doctor.professional_registration_number || 'Verified'}</p>
              </div>

              <div>
                <strong className="text-slate-900 block">Typical Consultation Time:</strong>
                <p className="mt-0.5">~15 minutes per patient</p>
              </div>
            </div>
          </div>

          <SafetyDisclaimer variant="small" />
        </div>
      </div>
    </div>
  );
}

