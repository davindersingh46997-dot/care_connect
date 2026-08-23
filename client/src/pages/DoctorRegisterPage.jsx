import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  Briefcase,
  Award,
  Phone,
  Mail,
  Lock,
  User,
  FileText,
  Navigation,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function DoctorRegisterPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    specialty: 'Dermatology',
    qualification: '',
    experience: 5,
    professional_registration_number: '',
    clinic_name: '',
    clinic_address: '',
    consultation_fee: 400,
    working_hours: '09:00 AM - 06:00 PM',
    latitude: '',
    longitude: '',
    profile_description: ''
  });

  const [locating, setLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const specialtiesList = [
    'General Physician',
    'Dermatology',
    'Dentistry',
    'Orthopedics',
    'Pediatrics',
    'Cardiology',
    'ENT',
    'Gynecology',
    'Ophthalmology',
    'Psychiatry',
    'Neurology',
    'Other Specialty'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'experience' || name === 'consultation_fee' ? Number(value) : value
    }));
  };

  const handleUseClinicLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please enter coordinates manually.');
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
        setError('Location access denied. Please enter your clinic latitude and longitude manually.');
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

    if (!formData.latitude || !formData.longitude) {
      setError('Please provide your clinic latitude and longitude or click "Use Clinic Location".');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        specialty: formData.specialty,
        qualification: formData.qualification.trim(),
        experience: Number(formData.experience),
        consultation_fee: Number(formData.consultation_fee),
        clinic_name: formData.clinic_name.trim(),
        clinic_address: formData.clinic_address.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        working_hours: formData.working_hours.trim(),
        professional_registration_number: formData.professional_registration_number.trim(),
        profile_description: formData.profile_description.trim()
      };

      const res = await api.auth.registerDoctor(payload);
      loginUser(res.access_token, res.user, res.doctor);
      navigate('/doctor/dashboard');
    } catch (err) {
      setError(err.message || 'Doctor registration failed. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Join Care Connect as a Doctor
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Create your certified healthcare practice account to receive patients and manage digital clinic queues in real-time.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-xs">
        {/* Section 1: Personal Information */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold text-slate-700">Full Name (with title)</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Dr. Sarah Jenkins"
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
                placeholder="doctor@example.com"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create secure password"
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
                placeholder="Repeat secure password"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Professional Information */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Professional Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Specialization</label>
              <select
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white font-medium"
              >
                {specialtiesList.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Qualification & Degrees</label>
              <input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                placeholder="e.g. MBBS, MD (Dermatology) - AIIMS"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Years of Experience</label>
              <input
                type="number"
                name="experience"
                min="0"
                max="60"
                value={formData.experience}
                onChange={handleChange}
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Professional Registration Number</label>
              <input
                type="text"
                name="professional_registration_number"
                value={formData.professional_registration_number}
                onChange={handleChange}
                placeholder="e.g. MCI-2016-88921"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Clinic Information */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Clinic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Clinic / Hospital Name</label>
              <input
                type="text"
                name="clinic_name"
                value={formData.clinic_name}
                onChange={handleChange}
                placeholder="e.g. Apex Skin & Laser Clinic"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Consultation Fee (₹)</label>
              <input
                type="number"
                name="consultation_fee"
                min="0"
                step="50"
                value={formData.consultation_fee}
                onChange={handleChange}
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold text-slate-700">Clinic Street Address</label>
              <input
                type="text"
                name="clinic_address"
                value={formData.clinic_address}
                onChange={handleChange}
                placeholder="e.g. Shop 4, Green Glen Layout, Bellandur, Bengaluru"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold text-slate-700">Working Hours</label>
              <input
                type="text"
                name="working_hours"
                value={formData.working_hours}
                onChange={handleChange}
                placeholder="e.g. 09:00 AM - 07:00 PM"
                required
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* Geolocation Section */}
            <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block">Clinic Coordinates</span>
                  <span className="text-[11px] text-slate-500">
                    Used for patient distance calculation and nearby provider ranking.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleUseClinicLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? 'Acquiring GPS...' : 'Use Clinic Location'}</span>
                </button>
              </div>

              {locationSuccess && (
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  GPS coordinates populated successfully!
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="e.g. 12.9244"
                    required
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="e.g. 77.6741"
                    required
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Profile Description */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Profile
            </h2>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Professional Description</label>
            <textarea
              name="profile_description"
              rows="4"
              value={formData.profile_description}
              onChange={handleChange}
              placeholder="Describe your clinical expertise, focus areas, and patient approach..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            By registering, your clinic status will default to <strong className="text-slate-900">CLOSED</strong> until you open your practice.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-2xl shadow-md hover:shadow-teal-500/20 transition-all text-xs sm:text-sm disabled:opacity-50"
          >
            {loading ? 'Creating Doctor Account...' : 'Create Doctor Account'}
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-500">
          Already registered as a healthcare provider?{' '}
          <Link to="/login" className="text-teal-700 font-bold hover:underline">
            Sign In to Doctor Portal
          </Link>
        </p>
      </form>
    </div>
  );
}
