import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  LogOut,
  MapPin,
  Sparkles,
  Bell,
  Stethoscope,
  ChevronRight,
  ExternalLink,
  Star,
  MessageSquare,
  AlertCircle,
  Building2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SafetyDisclaimer from '../components/SafetyDisclaimer';
import confetti from 'canvas-confetti';

export default function PatientQueuePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pastVisits, setPastVisits] = useState([]);
  const [hasCelebratedNext, setHasCelebratedNext] = useState(false);

  // Review modal / form state
  const [reviewVisit, setReviewVisit] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);

  const fetchLiveQueue = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.queue.getPatientQueue();
      if (res.has_active_queue) {
        setQueueData(res.active_queue);

        // Confetti when patient is next or consulting
        if ((res.active_queue.is_next || res.active_queue.status === 'CONSULTING') && !hasCelebratedNext) {
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.5 }
            });
          } catch (_) {}
          setHasCelebratedNext(true);
        }
      } else {
        setQueueData(null);
        setPastVisits(res.recent_visits || []);
      }
    } catch (err) {
      console.warn('Error fetching patient live queue:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login?redirect=/patient/queue');
      return;
    }

    fetchLiveQueue();
    // Poll every 4 seconds for real-time doctor advances
    const interval = setInterval(() => {
      fetchLiveQueue(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAuthenticated, hasCelebratedNext]);

  const handleLeaveQueue = async () => {
    if (!window.confirm('Are you sure you want to cancel your position in the clinic queue?')) {
      return;
    }

    setLeaving(true);
    try {
      await api.queue.leave();
      setQueueData(null);
      await fetchLiveQueue(true);
    } catch (err) {
      console.error('Error leaving queue:', err);
    } finally {
      setLeaving(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewVisit) return;
    setSubmittingReview(true);
    setReviewError(null);

    try {
      await api.doctors.submitReview(reviewVisit.doctor_id, {
        queue_entry_id: reviewVisit.id,
        rating: Number(rating),
        comment: comment.trim()
      });

      setReviewSuccess(`Review submitted for ${reviewVisit.doctor_name}! Thank you.`);
      setReviewVisit(null);
      setComment('');
      setRating(5);
      await fetchLiveQueue(true);
      setTimeout(() => setReviewSuccess(null), 4000);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Connecting to real-time clinic queue...</p>
      </div>
    );
  }

  // If no active queue
  if (!queueData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {reviewSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reviewSuccess}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">No Active Queue Token</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            You are not currently waiting in any clinic queue. Discover a nearby doctor and secure a live digital token.
          </p>
          <div className="pt-2">
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all"
            >
              Find a Doctor & Join Queue
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Review Modal */}
        {reviewVisit && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Review Consultation with {reviewVisit.doctor_name}
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewVisit(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {reviewError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Rating (1 to 5 Stars)</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-bold text-slate-700 ml-2">{rating} / 5</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Your Feedback</label>
                  <textarea
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience regarding punctuality, diagnosis, and clinic atmosphere..."
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewVisit(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold disabled:opacity-50 shadow-xs"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Past Visit History */}
        {pastVisits.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Completed Consultations & History
            </h3>
            <div className="space-y-3">
              {pastVisits.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{v.doctor_name}</h4>
                    <p className="text-slate-500">{v.doctor_specialty} • {v.clinic_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Token #{v.token_number} • {v.created_at?.slice(0, 10)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Consultation Completed
                    </span>

                    <button
                      onClick={() => setReviewVisit(v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Review Doctor</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isConsulting = queueData.status === 'CONSULTING';
  const isNext = queueData.is_next && !isConsulting;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Real-time Alert Banner when Next or Consulting */}
      {(isNext || isConsulting) && (
        <div
          className={`p-5 rounded-3xl text-white shadow-xl flex items-center justify-between gap-4 animate-in zoom-in duration-200 ${
            isConsulting
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
              : 'bg-gradient-to-r from-amber-500 to-rose-500 animate-urgent-glow'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {isConsulting
                  ? "🩺 You're in consultation now!"
                  : "🔔 You're next in line! Please step up."}
              </h3>
              <p className="text-xs text-white/90">
                {isConsulting
                  ? `You are currently inside the consultation room with ${queueData.doctor_name || 'the doctor'}.`
                  : `Doctor is ready for Token #${queueData.token_number}. Please proceed directly to ${queueData.clinic_name || 'the clinic'}.`}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white text-slate-900 text-xs font-black rounded-xl shadow-xs shrink-0">
            {isConsulting ? 'Consulting' : 'Turn Ready'}
          </span>
        </div>
      )}

      {/* Main Queue Status Board */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Sync Active
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Live Queue Tracker
            </h1>
            <p className="text-xs text-slate-500">
              Real-time token and waiting updates straight from the clinic desk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLiveQueue(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>

            <button
              onClick={handleLeaveQueue}
              disabled={leaving || isConsulting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Queue</span>
            </button>
          </div>
        </div>

        {/* 4-Stat Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Your Token */}
          <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-center space-y-1">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">
              Your Token
            </span>
            <div className="text-3xl font-black text-teal-900">
              #{queueData.token_number}
            </div>
            <span className="text-[10px] text-teal-700 font-semibold uppercase tracking-wider">
              {queueData.status}
            </span>
          </div>

          {/* Current Serving */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Current Serving
            </span>
            <div className="text-3xl font-black text-slate-900">
              #{queueData.current_token_in_consultation || '-'}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Inside Doctor Room</span>
          </div>

          {/* Patients Ahead */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Patients Ahead
            </span>
            <div className="text-3xl font-black text-slate-900">
              {queueData.patients_ahead || 0}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">In Waiting Line</span>
          </div>

          {/* Est Wait */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-center space-y-1">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
              Estimated Wait
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-950">
              ~{queueData.estimated_wait_mins || 0}m
            </div>
            <span className="text-[10px] text-amber-700 font-medium">Dynamic ETA</span>
          </div>
        </div>

        {/* Doctor & Clinic Card */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
              {queueData.doctor_name ? queueData.doctor_name.replace(/^Dr\.\s*/i, '').charAt(0) : 'D'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{queueData.doctor_name}</h3>
              <p className="text-xs font-semibold text-teal-700">{queueData.doctor_specialty} • {queueData.clinic_name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {queueData.clinic_address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              to={`/doctors/${queueData.doctor_id}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              View Clinic Profile
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <SafetyDisclaimer variant="small" />
        </div>
      </div>
    </div>
  );
}

