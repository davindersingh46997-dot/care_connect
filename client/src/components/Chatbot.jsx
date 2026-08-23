import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, ChevronRight, MapPin, MessageCircle, Send, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const hiddenPaths = ['/login', '/signup', '/patient/signup', '/doctor/register'];
const suggestions = [
  { label: 'Find doctors', message: 'show doctors' },
  { label: 'My queue', message: 'what is my queue number?' },
  { label: 'Change theme', message: 'dark mode' },
  { label: 'How it works', message: 'how does Care Connect work?' }
];

export default function Chatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isDoctor } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { from: 'assistant', text: "Hi! I'm the Care Connect Assistant. I can help you navigate the app, find doctors, check your queue, and answer common questions." }
  ]);
  const [loading, setLoading] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(false);

  useEffect(() => {
    if (location.pathname === '/doctor/queue' || location.pathname === '/patient/queue') setOpen(false);
  }, [location.pathname]);

  if (hiddenPaths.includes(location.pathname)) return null;

  const applyTheme = (theme) => {
    const dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('careconnect_theme', dark ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('careconnect-theme-change', { detail: { dark } }));
  };

  const executeAction = async (result) => {
    switch (result.action) {
      case 'SET_DARK_MODE': applyTheme('dark'); break;
      case 'SET_LIGHT_MODE': applyTheme('light'); break;
      case 'TOGGLE_THEME': applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'); break;
      case 'OPEN_DOCTOR_SEARCH': navigate('/doctors'); break;
      case 'SEARCH_SPECIALTY': navigate(`/doctors?specialty=${encodeURIComponent(result.data?.specialty || '')}`); break;
      case 'OPEN_QUEUE': navigate('/patient/queue'); break;
      case 'OPEN_DOCTOR_QUEUE': navigate('/doctor/queue'); break;
      case 'OPEN_DOCTOR_REGISTER': navigate('/doctor/register'); break;
      case 'LOGIN': navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`); break;
      case 'REQUEST_LOCATION':
        if (!navigator.geolocation) {
          setMessages((current) => [...current, { from: 'assistant', text: 'Location is not supported by this browser. I can still open general doctor search.' }]);
          navigate(`/doctors?specialty=${encodeURIComponent(result.data?.specialty || '')}`);
          break;
        }
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => navigate(`/doctors?specialty=${encodeURIComponent(result.data?.specialty || '')}&lat=${coords.latitude.toFixed(4)}&lng=${coords.longitude.toFixed(4)}`),
          () => setMessages((current) => [...current, { from: 'assistant', text: 'Location permission was not granted. I can show general results instead.' }])
        );
        break;
      case 'CONFIRM_LEAVE_QUEUE': setPendingLeave(true); break;
      case 'CALL_NEXT_PATIENT':
        if (isDoctor) {
          const response = await api.queue.callNext({ doctorId: user?.doctor?.id || user?.doctor_id || 'doc-1' });
          setMessages((current) => [...current, { from: 'assistant', text: response.message || 'The next patient has been called.' }]);
        }
        break;
      default: break;
    }
  };

  const sendMessage = async (value = message) => {
    const text = value.trim();
    if (!text || loading) return;
    setMessage('');
    setMessages((current) => [...current, { from: 'user', text }]);
    setLoading(true);
    try {
      const result = await api.chat.send(text);
      setMessages((current) => [...current, { from: 'assistant', text: result.response, doctors: result.data?.doctors }]);
      await executeAction(result);
    } catch (_) {
      setMessages((current) => [...current, { from: 'assistant', text: "I couldn't reach Care Connect right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmLeave = async () => {
    setPendingLeave(false);
    setLoading(true);
    try {
      const result = await api.queue.leave({ patientId: user?.id });
      setMessages((current) => [...current, { from: 'assistant', text: result.message || 'You have left the queue.' }]);
    } catch (_) {
      setMessages((current) => [...current, { from: 'assistant', text: "I couldn't leave the queue right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <section className="fixed bottom-20 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" aria-label="Care Connect Assistant">
          <header className="flex items-center justify-between bg-teal-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><div><h2 className="text-sm font-bold">Care Connect Assistant</h2><p className="text-[11px] text-teal-100">Navigation and real application help</p></div></div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-teal-600" aria-label="Close assistant"><X className="h-4 w-4" /></button>
          </header>
          <div className="max-h-[min(56vh,460px)] space-y-3 overflow-y-auto p-3" aria-live="polite">
            {messages.map((item, index) => (
              <div key={`${item.from}-${index}`} className={`flex ${item.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${item.from === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                  {item.text}
                  {item.doctors?.length > 0 && <div className="mt-2 space-y-1.5">{item.doctors.slice(0, 3).map((doctor) => <button key={doctor.id} onClick={() => navigate(`/doctors/${doctor.id}`)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-left text-[11px] text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-100"><span><strong>{doctor.name}</strong><span className="block text-slate-500 dark:text-slate-300">{doctor.specialty} · ₹{doctor.fee}</span></span><ChevronRight className="h-3.5 w-3.5 shrink-0" /></button>)}</div>}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-slate-400">Checking Care Connect...</div>}
          </div>
          {pendingLeave && <div className="border-t border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p>Are you sure you want to leave your current queue?</p><div className="mt-2 flex gap-2"><button onClick={confirmLeave} className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white">Leave Queue</button><button onClick={() => setPendingLeave(false)} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700">Cancel</button></div></div>}
          <div className="flex flex-wrap gap-1.5 border-t border-slate-200 p-3 dark:border-slate-700">{suggestions.map((item) => <button key={item.label} onClick={() => sendMessage(item.message)} className="rounded-full border border-teal-200 px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300">{item.label}</button>)}</div>
          <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type your message..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /><button disabled={loading} className="rounded-xl bg-teal-600 px-3 text-white disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4" /></button></form>
        </section>
      )}
      <button onClick={() => setOpen((current) => !current)} className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg transition-transform hover:scale-105" aria-label={open ? 'Close assistant' : 'Open Care Connect Assistant'} title="Care Connect Assistant"><MessageCircle className="h-5 w-5" /></button>
    </>
  );
}
