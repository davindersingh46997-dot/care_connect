import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Stethoscope,
  Clock,
  DollarSign,
  MapPin,
  Save,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';

export default function DoctorProfileEditPage() {
  const navigate = useNavigate();
  const { user, doctorInfo, isDoctor, isAuthenticated, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    experience: 5,
    qualification: '',
    fee: 400,
    clinic_name: '',
    address: '',
    working_hours: '09:00 AM - 06:00 PM',
    bio: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const docId = doctorInfo?.id;

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login?redirect=/doctor/profile');
      return;
    }
    if (isAuthenticated && !isDoctor) {
      navigate('/patient/dashboard');
      return;
    }

    const fetchDoc = async () => {
      try {
        if (docId) {
          const res = await api.doctors.getById(docId);
          setFormData({
            name: res.name || user?.name || '',
            specialty: res.specialty || '',
            experience: res.experience || 5,
            qualification: res.qualification || '',
            fee: res.fee ?? res.consultation_fee ?? 400,
            clinic_name: res.clinic_name || '',
            address: res.address || res.clinic_address || '',
            working_hours: res.working_hours || '09:00 AM - 06:00 PM',
            bio: res.bio || res.profile_description || ''
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [isAuthenticated, isDoctor, docId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'fee' || name === 'experience' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      if (!docId) throw new Error('Doctor ID not found.');
      await api.doctors.updateProfile(docId, {
        name: formData.name.trim(),
        specialty: formData.specialty.trim(),
        qualification: formData.qualification.trim(),
        experience: Number(formData.experience),
        fee: Number(formData.fee),
        clinic_name: formData.clinic_name.trim(),
        address: formData.address.trim(),
        working_hours: formData.working_hours.trim(),
        profile_description: formData.bio.trim()
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900">Clinic Profile & Practice Settings</h1>
          <p className="text-xs text-slate-500">Update your clinic details, fee structure, and consultation times.</p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes saved successfully! Patients and ranking algorithms now see updated details.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 text-xs">
        {/* Name & Specialty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Doctor Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Medical Specialty</label>
            <input
              type="text"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              required
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Qualifications & Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Qualifications</label>
            <input
              type="text"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Years of Experience</label>
            <input
              type="number"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Consultation Fee & Avg Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Consultation Fee (₹)</label>
            <input
              type="number"
              name="fee"
              value={formData.fee}
              onChange={handleChange}
              required
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Avg Consultation Time (Minutes)</label>
            <input
              type="number"
              name="avg_consult_time_mins"
              value={formData.avg_consult_time_mins}
              onChange={handleChange}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Clinic Name & Address */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Clinic Name</label>
          <input
            type="text"
            name="clinic_name"
            value={formData.clinic_name}
            onChange={handleChange}
            required
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Clinic Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Working Hours */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Working Hours</label>
          <input
            type="text"
            name="working_hours"
            value={formData.working_hours}
            onChange={handleChange}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Biography */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Professional Bio & Focus</label>
          <textarea
            name="bio"
            rows="3"
            value={formData.bio}
            onChange={handleChange}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
