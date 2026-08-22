import { db } from '../data/database.js';

// POST /api/auth/demo-login
export function demoLogin(req, res) {
  try {
    const { role = 'patient' } = req.body;
    const store = db.get();

    if (role === 'doctor') {
      const user = store.users.find((u) => u.email === 'doctor@careconnect.demo');
      const doctor = store.doctors.find((d) => d.user_id === user.id);
      return res.json({
        user,
        doctor,
        role: 'doctor',
        token: 'demo-doctor-token'
      });
    } else {
      const user = store.users.find((u) => u.email === 'patient@careconnect.demo');
      return res.json({
        user,
        role: 'patient',
        token: 'demo-patient-token'
      });
    }
  } catch (err) {
    console.error('Error in demo login:', err);
    return res.status(500).json({ error: 'Failed to demo login' });
  }
}

// POST /api/auth/login
export function login(req, res) {
  try {
    const { email } = req.body;
    const store = db.get();
    const user = store.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());

    if (!user) {
      // Auto-provision demo account for quick hackathon review
      const isDoc = email && email.includes('doctor');
      const newUser = {
        id: isDoc ? `doctor-${Date.now()}` : `patient-${Date.now()}`,
        name: isDoc ? 'Dr. Healthcare Specialist' : 'Guest Patient',
        email: email || 'user@careconnect.demo',
        role: isDoc ? 'doctor' : 'patient',
        created_at: new Date().toISOString()
      };
      store.users.push(newUser);
      db.save();

      return res.json({
        user: newUser,
        role: newUser.role,
        token: `demo-token-${newUser.id}`
      });
    }

    const doctor = user.role === 'doctor' ? store.doctors.find((d) => d.user_id === user.id) : null;

    return res.json({
      user,
      doctor,
      role: user.role,
      token: `demo-token-${user.id}`
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

// POST /api/auth/register
export function register(req, res) {
  try {
    const { name, email, role = 'patient', age, location } = req.body;
    const store = db.get();

    const newUser = {
      id: `${role}-${Date.now()}`,
      name: name || 'New User',
      email: email || `user_${Date.now()}@careconnect.demo`,
      role,
      age: age ? Number(age) : 25,
      location: location || 'Bengaluru',
      created_at: new Date().toISOString()
    };

    store.users.push(newUser);

    let createdDoc = null;
    if (role === 'doctor') {
      createdDoc = {
        id: `doc-${Date.now()}`,
        user_id: newUser.id,
        name: newUser.name,
        specialty: 'General Physician',
        experience: 5,
        qualification: 'MBBS',
        fee: 300,
        clinic_name: `${newUser.name}'s Clinic`,
        address: 'Bengaluru, India',
        latitude: 12.9352,
        longitude: 77.6741,
        rating: 5.0,
        reviews_count: 1,
        verified: true,
        status: 'open',
        working_hours: '09:00 AM - 06:00 PM',
        avg_consult_time_mins: 10,
        bio: 'Dedicated local healthcare practitioner providing compassionate patient care.',
        image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
        current_token: 1,
        is_accepting: true
      };
      store.doctors.push(createdDoc);
    }

    db.save();

    return res.status(201).json({
      user: newUser,
      doctor: createdDoc,
      role,
      token: `demo-token-${newUser.id}`
    });
  } catch (err) {
    console.error('Error during register:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
