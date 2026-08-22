import { db } from '../data/database.js';
import { rankDoctors } from '../services/rankingService.js';

// GET /api/doctors/search
export function searchDoctors(req, res) {
  try {
    const {
      specialty,
      lat,
      lng,
      priority,
      maxFee,
      maxDistance,
      onlyOpen,
      minRating
    } = req.query;

    const userLat = lat ? parseFloat(lat) : undefined;
    const userLng = lng ? parseFloat(lng) : undefined;

    const results = rankDoctors({
      specialty: specialty || '',
      userLat,
      userLng,
      priority: priority || 'best_match',
      maxFee: maxFee ? Number(maxFee) : null,
      maxDistance: maxDistance ? Number(maxDistance) : null,
      onlyOpen: onlyOpen === 'true',
      minRating: minRating ? Number(minRating) : null
    });

    return res.json({
      count: results.length,
      specialty: specialty || 'All Specialties',
      priority: priority || 'best_match',
      doctors: results
    });
  } catch (err) {
    console.error('Error searching doctors:', err);
    return res.status(500).json({ error: 'Failed to search doctors' });
  }
}

// GET /api/doctors
export function getAllDoctors(req, res) {
  try {
    const { specialty } = req.query;
    const results = rankDoctors({ specialty: specialty || '' });
    return res.json({ doctors: results });
  } catch (err) {
    console.error('Error fetching doctors:', err);
    return res.status(500).json({ error: 'Failed to fetch doctors' });
  }
}

// GET /api/doctors/:id
export function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    const store = db.get();
    const doc = store.doctors.find((d) => d.id === id);

    if (!doc) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const docQueues = store.queues.filter((q) => q.doctor_id === id);
    const waitingList = docQueues.filter((q) => q.status === 'waiting');
    const consultingPatient = docQueues.find((q) => q.status === 'consulting');
    const docReviews = store.reviews.filter((r) => r.doctor_id === id);

    const activeWaitCount = waitingList.length + (consultingPatient ? 1 : 0);
    const estimatedWait = Math.max(5, activeWaitCount * (doc.avg_consult_time_mins || 10));

    return res.json({
      doctor: {
        ...doc,
        current_token: doc.current_token || (consultingPatient ? consultingPatient.token_number : 0),
        estimated_wait_mins: estimatedWait,
        waiting_count: waitingList.length,
        is_consulting: !!consultingPatient,
        consulting_patient: consultingPatient ? {
          token: consultingPatient.token_number,
          name: consultingPatient.patient_name
        } : null,
        reviews: docReviews
      }
    });
  } catch (err) {
    console.error('Error fetching doctor by id:', err);
    return res.status(500).json({ error: 'Failed to fetch doctor details' });
  }
}

// PATCH /api/doctors/:id/status
export function updateDoctorStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, is_accepting } = req.body;

    const store = db.get();
    const docIndex = store.doctors.findIndex((d) => d.id === id);

    if (docIndex === -1) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    if (status !== undefined) {
      store.doctors[docIndex].status = status; // 'open' | 'closed'
    }
    if (is_accepting !== undefined) {
      store.doctors[docIndex].is_accepting = Boolean(is_accepting);
    }

    db.save();

    return res.json({
      message: 'Clinic status updated successfully',
      doctor: store.doctors[docIndex]
    });
  } catch (err) {
    console.error('Error updating doctor status:', err);
    return res.status(500).json({ error: 'Failed to update clinic status' });
  }
}

// PATCH /api/doctors/:id
export function updateDoctorProfile(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const store = db.get();
    const docIndex = store.doctors.findIndex((d) => d.id === id);

    if (docIndex === -1) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const allowedFields = [
      'name',
      'specialty',
      'experience',
      'qualification',
      'fee',
      'clinic_name',
      'address',
      'working_hours',
      'avg_consult_time_mins',
      'bio'
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        store.doctors[docIndex][field] = updates[field];
      }
    });

    db.save();

    return res.json({
      message: 'Doctor profile updated successfully',
      doctor: store.doctors[docIndex]
    });
  } catch (err) {
    console.error('Error updating doctor profile:', err);
    return res.status(500).json({ error: 'Failed to update doctor profile' });
  }
}
