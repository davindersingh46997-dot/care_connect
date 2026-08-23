import { db } from '../data/database.js';
import { rankDoctors } from '../services/rankingService.js';

const FAQS = [
  { test: /what is care connect|what does care connect do/i, response: 'Care Connect helps you discover healthcare providers based on specialty, location, availability, fee and estimated waiting time.' },
  { test: /how does care connect work|how does this work/i, response: 'Describe your concern or search by specialty, review a provider profile, then join the digital queue when the clinic is accepting patients.' },
  { test: /how do i find|find a doctor|show doctors|need a doctor/i, response: 'Opening doctor search so you can browse registered healthcare providers.' , action: 'OPEN_DOCTOR_SEARCH' },
  { test: /how.*join.*queue|join a queue/i, response: 'Find a doctor, open their profile, and select Join Queue when the clinic is open. You need to be signed in.' , action: 'OPEN_DOCTOR_SEARCH' },
  { test: /waiting time|how long.*wait/i, response: 'Estimated waiting time is based on patients ahead of you and the provider average consultation duration. It is an estimate, not a guarantee.' },
  { test: /location|near me without|share.*location/i, response: 'Location is optional. General search works without it; nearby search asks for browser permission only when needed.' },
  { test: /register.*doctor|doctor.*register|receive patients|clinic status/i, response: 'Doctors can register a clinic, set its availability, and manage patients from the Doctor Portal.', action: 'OPEN_DOCTOR_REGISTER' },
  { test: /sign.?up|login required|need.*account/i, response: 'You can browse doctors without an account. Sign in is required for personalized features such as joining or viewing your queue.' }
];

function authenticatedUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const id = token?.startsWith('demo-token-') ? token.replace('demo-token-', '') : token === 'demo-patient-token' ? 'patient-1' : token === 'demo-doctor-token' ? 'doctor-1' : null;
  return id ? db.get().users.find((user) => user.id === id) || null : null;
}

function specialtyFromMessage(message) {
  const specialties = [
    ['dentist|dentistry|tooth', 'Dentistry'],
    ['dermatologist|dermatology|skin|rash|itch', 'Dermatology'],
    ['cardiologist|cardiology|heart', 'Cardiology'],
    ['pediatrician|pediatrics|child|kid', 'Pediatrics'],
    ['orthopedic|orthopedics|bone|joint', 'Orthopedics'],
    ['gynecologist|gynecology', 'Gynecology'],
    ['ent|ear|nose|throat', 'ENT'],
    ['general physician|doctor', 'General Physician']
  ];
  return specialties.find(([pattern]) => new RegExp(pattern, 'i').test(message))?.[1] || null;
}

function queueForPatient(userId) {
  const store = db.get();
  const entry = store.queues
    .filter((queue) => queue.patient_id === userId && ['waiting', 'consulting'].includes(queue.status))
    .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))[0];
  if (!entry) return null;
  const doctor = store.doctors.find((item) => item.id === entry.doctor_id);
  const doctorQueues = store.queues.filter((queue) => queue.doctor_id === entry.doctor_id);
  const consulting = doctorQueues.find((queue) => queue.status === 'consulting');
  const patientsAhead = entry.status === 'consulting' ? 0 : doctorQueues.filter((queue) => queue.status === 'waiting' && queue.token_number < entry.token_number).length + (consulting && consulting.token_number < entry.token_number ? 1 : 0);
  return { token: entry.token_number, current_token: consulting?.token_number || doctor?.current_token || 0, patients_ahead: patientsAhead, estimated_wait_minutes: entry.status === 'consulting' ? 0 : Math.max(2, patientsAhead * (doctor?.avg_consult_time_mins || 10)) };
}

export function chat(req, res) {
  const message = String(req.body?.message || '').trim();
  const lower = message.toLowerCase();
  const user = authenticatedUser(req);
  if (!message) return res.json({ intent: 'UNKNOWN_INTENT', response: 'Tell me what you would like to do.', action: 'NONE' });
  if (/chest pain|difficulty breathing|can.t breathe|severe bleeding|stroke/i.test(message)) return res.json({ intent: 'EMERGENCY', response: 'This may require urgent medical attention. Please seek emergency medical care immediately rather than relying on Care Connect for diagnosis or treatment.', action: 'NONE' });
  if (/what disease|diagnos|prescription|medicine|medication/i.test(message)) return res.json({ intent: 'MEDICAL_BOUNDARY', response: "I can help you find an appropriate healthcare provider, but I can't diagnose medical conditions or recommend treatment.", action: 'OPEN_DOCTOR_SEARCH' });
  if (/dark mode|make.*dark|switch.*dark/i.test(message)) return res.json({ intent: 'SET_DARK_MODE', response: 'Dark mode is on.', action: 'SET_DARK_MODE' });
  if (/light mode|make.*light|switch.*light/i.test(message)) return res.json({ intent: 'SET_LIGHT_MODE', response: 'Light mode is on.', action: 'SET_LIGHT_MODE' });
  if (/toggle.*theme|switch theme/i.test(message)) return res.json({ intent: 'TOGGLE_THEME', response: 'Theme switched.', action: 'TOGGLE_THEME' });
  if (/call next/i.test(message)) {
    if (!user || user.role !== 'doctor') return res.json({ intent: 'CALL_NEXT_PATIENT', response: 'You need a doctor account to manage the clinic queue.', action: 'NONE' });
    return res.json({ intent: 'CALL_NEXT_PATIENT', response: 'Calling the next patient now.', action: 'CALL_NEXT_PATIENT' });
  }
  if (/my queue|my token|queue number|people ahead|waiting time|where am i/i.test(message)) {
    if (!user) return res.json({ intent: 'GET_MY_QUEUE', response: 'Please sign in to view your queue.', action: 'LOGIN' });
    if (user.role === 'doctor') return res.json({ intent: 'GET_DOCTOR_QUEUE', response: 'Opening your queue desk.', action: 'OPEN_DOCTOR_QUEUE' });
    const queue = queueForPatient(user.id);
    return res.json(queue ? { intent: 'GET_MY_QUEUE', response: `Your token is #${queue.token}. The current token is #${queue.current_token}. There are ${queue.patients_ahead} patients ahead of you. Estimated waiting time is ~${queue.estimated_wait_minutes} minutes.`, action: 'OPEN_QUEUE', data: queue } : { intent: 'GET_MY_QUEUE', response: 'You do not have an active queue.', action: 'OPEN_QUEUE', data: null });
  }
  if (/leave.*queue|cancel.*queue|don.t want to wait/i.test(message)) return res.json({ intent: 'LEAVE_QUEUE', response: user ? 'Are you sure you want to leave your current queue?' : 'Please sign in to manage your queue.', action: user ? 'CONFIRM_LEAVE_QUEUE' : 'LOGIN' });
  const specialty = specialtyFromMessage(message);
  if (/near me|nearby/i.test(message)) return res.json({ intent: 'SEARCH_NEARBY_DOCTORS', specialty, response: `Share your location to find nearby${specialty ? ` ${specialty.toLowerCase()}` : ''} providers.`, action: 'REQUEST_LOCATION', data: { specialty } });
  if (/show doctors|find doctors|find a doctor|need a doctor|available doctors/i.test(message) || specialty) {
    const doctors = rankDoctors({ specialty: specialty || '' });
    return res.json({ intent: specialty ? 'SEARCH_SPECIALTY' : 'OPEN_DOCTOR_SEARCH', response: doctors.length ? `I found ${doctors.length} registered provider${doctors.length === 1 ? '' : 's'}.` : 'No registered doctors match that search.', action: specialty ? 'SEARCH_SPECIALTY' : 'OPEN_DOCTOR_SEARCH', data: { specialty, doctors } });
  }
  const faq = FAQS.find((item) => item.test.test(lower));
  if (faq) return res.json({ intent: 'FAQ', response: faq.response, action: faq.action || 'NONE' });
  return res.json({ intent: 'UNKNOWN_INTENT', response: 'I can help you find doctors, check your queue, change the theme, or explain how Care Connect works.', action: 'NONE' });
}
