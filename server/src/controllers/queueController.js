import { db } from '../data/database.js';

// POST /api/queue/join
export function joinQueue(req, res) {
  try {
    const {
      doctorId,
      patientId = 'patient-1',
      patientName = 'Jashandeep Singh',
      patientPhone = '+91 98765 43210'
    } = req.body;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const store = db.get();
    const doc = store.doctors.find((d) => d.id === doctorId);
    if (!doc) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    if (doc.status === 'closed' || !doc.is_accepting) {
      return res.status(400).json({
        error: 'This clinic is currently not accepting new queue entries.'
      });
    }

    // Check duplicate active queue entry for the same patient and doctor
    const existingActive = store.queues.find(
      (q) =>
        q.doctor_id === doctorId &&
        q.patient_id === patientId &&
        (q.status === 'waiting' || q.status === 'consulting')
    );

    if (existingActive) {
      const docQueues = store.queues.filter((q) => q.doctor_id === doctorId);
      const consulting = docQueues.find((q) => q.status === 'consulting');
      const currentToken = consulting ? consulting.token_number : doc.current_token || 0;

      const waitingAhead = docQueues.filter(
        (q) => q.status === 'waiting' && q.token_number < existingActive.token_number
      ).length;
      const patientsAhead = waitingAhead + (consulting && consulting.token_number < existingActive.token_number ? 1 : 0);
      const estWait = Math.max(2, patientsAhead * (doc.avg_consult_time_mins || 10));

      return res.json({
        message: 'You are already in the queue for this doctor.',
        alreadyJoined: true,
        queueEntry: existingActive,
        token: existingActive.token_number,
        currentToken,
        patientsAhead,
        estimatedWaitMinutes: estWait,
        isNext: patientsAhead === 0
      });
    }

    // Generate next token number
    const docQueues = store.queues.filter((q) => q.doctor_id === doctorId);
    const maxToken = docQueues.reduce((max, q) => Math.max(max, q.token_number || 0), 16);
    const newTokenNumber = maxToken + 1;

    const newQueueEntry = {
      id: `q-${Date.now()}`,
      doctor_id: doctorId,
      patient_id: patientId,
      patient_name: patientName,
      patient_phone: patientPhone,
      token_number: newTokenNumber,
      status: 'waiting',
      joined_at: new Date().toISOString(),
      called_at: null,
      completed_at: null
    };

    store.queues.push(newQueueEntry);
    db.save();

    const consulting = docQueues.find((q) => q.status === 'consulting');
    const currentToken = consulting ? consulting.token_number : (doc.current_token || 14);

    const waitingAhead = docQueues.filter(
      (q) => q.status === 'waiting' && q.token_number < newTokenNumber
    ).length;
    const patientsAhead = waitingAhead + (consulting ? 1 : 0);
    const estWait = Math.max(5, patientsAhead * (doc.avg_consult_time_mins || 10));

    return res.status(201).json({
      message: 'Successfully joined the digital queue!',
      alreadyJoined: false,
      queueEntry: newQueueEntry,
      token: newTokenNumber,
      currentToken,
      patientsAhead,
      estimatedWaitMinutes: estWait,
      isNext: patientsAhead === 0
    });
  } catch (err) {
    console.error('Error joining queue:', err);
    return res.status(500).json({ error: 'Failed to join queue' });
  }
}

// GET /api/queue/:doctorId (Doctor Queue View)
export function getDoctorQueue(req, res) {
  try {
    const { doctorId } = req.params;
    const store = db.get();
    const doc = store.doctors.find((d) => d.id === doctorId);

    if (!doc) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const docQueues = store.queues.filter((q) => q.doctor_id === doctorId);

    const consulting = docQueues.find((q) => q.status === 'consulting') || null;
    const waiting = docQueues
      .filter((q) => q.status === 'waiting')
      .sort((a, b) => a.token_number - b.token_number);
    const completed = docQueues
      .filter((q) => q.status === 'completed')
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''));
    const skipped = docQueues.filter((q) => q.status === 'skipped');

    const currentToken = consulting ? consulting.token_number : doc.current_token || 0;
    const estWait = (waiting.length + (consulting ? 1 : 0)) * (doc.avg_consult_time_mins || 10);

    return res.json({
      doctor: {
        id: doc.id,
        name: doc.name,
        specialty: doc.specialty,
        clinic_name: doc.clinic_name,
        status: doc.status,
        is_accepting: doc.is_accepting,
        current_token: currentToken
      },
      overview: {
        totalPatientsToday: docQueues.length,
        completedCount: completed.length,
        waitingCount: waiting.length,
        currentToken,
        estimatedWaitMinutes: Math.max(5, estWait)
      },
      consulting,
      waiting,
      completed,
      skipped
    });
  } catch (err) {
    console.error('Error getting doctor queue:', err);
    return res.status(500).json({ error: 'Failed to fetch doctor queue' });
  }
}

// GET /api/queue/patient/:patientId (Patient Active Queue Tracker)
export function getPatientQueue(req, res) {
  try {
    const { patientId } = req.params;
    const store = db.get();

    // Find latest active queue entry (waiting or consulting)
    const activeEntry = store.queues
      .filter(
        (q) =>
          q.patient_id === patientId &&
          (q.status === 'waiting' || q.status === 'consulting')
      )
      .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))[0];

    if (!activeEntry) {
      // Also fetch recent completed visits for patient dashboard
      const pastVisits = store.queues
        .filter((q) => q.patient_id === patientId && q.status === 'completed')
        .map((q) => {
          const doc = store.doctors.find((d) => d.id === q.doctor_id);
          return {
            ...q,
            doctor_name: doc?.name || 'Dr. Specialist',
            doctor_specialty: doc?.specialty || 'General',
            clinic_name: doc?.clinic_name || 'Clinic'
          };
        });

      return res.json({
        hasActiveQueue: false,
        activeQueue: null,
        recentVisits: pastVisits
      });
    }

    const doc = store.doctors.find((d) => d.id === activeEntry.doctor_id);
    const docQueues = store.queues.filter((q) => q.doctor_id === activeEntry.doctor_id);

    const consulting = docQueues.find((q) => q.status === 'consulting');
    const currentToken = consulting ? consulting.token_number : (doc?.current_token || 0);

    const waitingAhead = docQueues.filter(
      (q) => q.status === 'waiting' && q.token_number < activeEntry.token_number
    ).length;

    // Is current patient currently consulting?
    const isCurrentlyConsulting = activeEntry.status === 'consulting';

    // Patients ahead: if someone is consulting, that's 1 ahead unless patient itself is consulting
    let patientsAhead = 0;
    if (isCurrentlyConsulting) {
      patientsAhead = 0;
    } else {
      patientsAhead = waitingAhead + (consulting && consulting.token_number < activeEntry.token_number ? 1 : 0);
    }

    const avgConsult = doc?.avg_consult_time_mins || 10;
    const estWait = isCurrentlyConsulting
      ? 0
      : patientsAhead === 0
      ? 2
      : patientsAhead * avgConsult;

    const isNext = patientsAhead === 0 || isCurrentlyConsulting;

    let alertMessage = null;
    if (isCurrentlyConsulting) {
      alertMessage = "🩺 You're in consultation now with the doctor!";
    } else if (isNext) {
      alertMessage = "🔔 You're next! Please proceed to the clinic.";
    }

    return res.json({
      hasActiveQueue: true,
      activeQueue: {
        id: activeEntry.id,
        token_number: activeEntry.token_number,
        status: activeEntry.status,
        joined_at: activeEntry.joined_at,
        called_at: activeEntry.called_at,
        current_token: currentToken,
        patients_ahead: patientsAhead,
        estimated_wait_mins: estWait,
        is_next: isNext,
        alert_message: alertMessage,
        doctor: doc
          ? {
              id: doc.id,
              name: doc.name,
              specialty: doc.specialty,
              clinic_name: doc.clinic_name,
              address: doc.address,
              fee: doc.fee,
              rating: doc.rating,
              image_url: doc.image_url,
              status: doc.status
            }
          : null
      }
    });
  } catch (err) {
    console.error('Error fetching patient queue:', err);
    return res.status(500).json({ error: 'Failed to fetch patient queue' });
  }
}

// POST /api/queue/call-next (Doctor calls next patient)
export function callNextPatient(req, res) {
  try {
    const { doctorId = 'doc-1' } = req.body;
    const store = db.get();
    const doc = store.doctors.find((d) => d.id === doctorId);

    if (!doc) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const docQueues = store.queues.filter((q) => q.doctor_id === doctorId);

    // 1. Mark existing consulting patient as completed
    const currentConsulting = docQueues.find((q) => q.status === 'consulting');
    if (currentConsulting) {
      currentConsulting.status = 'completed';
      currentConsulting.completed_at = new Date().toISOString();
    }

    // 2. Find next waiting patient with lowest token number
    const nextPatient = docQueues
      .filter((q) => q.status === 'waiting')
      .sort((a, b) => a.token_number - b.token_number)[0];

    if (nextPatient) {
      nextPatient.status = 'consulting';
      nextPatient.called_at = new Date().toISOString();
      doc.current_token = nextPatient.token_number;
    } else {
      // No more waiting patients
      if (currentConsulting) {
        doc.current_token = currentConsulting.token_number;
      }
    }

    db.save();

    return res.json({
      message: nextPatient
        ? `Called token #${nextPatient.token_number} (${nextPatient.patient_name})`
        : 'All waiting patients have been completed.',
      calledPatient: nextPatient || null,
      completedPatient: currentConsulting || null,
      currentToken: doc.current_token
    });
  } catch (err) {
    console.error('Error calling next patient:', err);
    return res.status(500).json({ error: 'Failed to call next patient' });
  }
}

// POST /api/queue/complete (Doctor finishes current patient)
export function completeConsultation(req, res) {
  try {
    const { doctorId = 'doc-1' } = req.body;
    const store = db.get();

    const currentConsulting = store.queues.find(
      (q) => q.doctor_id === doctorId && q.status === 'consulting'
    );

    if (currentConsulting) {
      currentConsulting.status = 'completed';
      currentConsulting.completed_at = new Date().toISOString();
      db.save();
    }

    return res.json({
      message: 'Consultation marked as completed',
      completedPatient: currentConsulting || null
    });
  } catch (err) {
    console.error('Error completing consultation:', err);
    return res.status(500).json({ error: 'Failed to complete consultation' });
  }
}

// POST /api/queue/skip (Doctor skips patient)
export function skipPatient(req, res) {
  try {
    const { queueId, doctorId = 'doc-1' } = req.body;
    const store = db.get();

    let target = null;
    if (queueId) {
      target = store.queues.find((q) => q.id === queueId);
    } else {
      target = store.queues.find(
        (q) => q.doctor_id === doctorId && (q.status === 'consulting' || q.status === 'waiting')
      );
    }

    if (target) {
      target.status = 'skipped';
      db.save();
    }

    return res.json({
      message: 'Patient skipped',
      skippedPatient: target || null
    });
  } catch (err) {
    console.error('Error skipping patient:', err);
    return res.status(500).json({ error: 'Failed to skip patient' });
  }
}

// POST /api/queue/leave (Patient leaves queue)
export function leaveQueue(req, res) {
  try {
    const { queueId, patientId = 'patient-1' } = req.body;
    const store = db.get();

    const target = store.queues.find(
      (q) =>
        (queueId ? q.id === queueId : q.patient_id === patientId) &&
        (q.status === 'waiting' || q.status === 'consulting')
    );

    if (target) {
      target.status = 'cancelled';
      db.save();
      return res.json({ message: 'You have left the queue successfully.' });
    }

    return res.status(404).json({ error: 'No active queue entry found to leave.' });
  } catch (err) {
    console.error('Error leaving queue:', err);
    return res.status(500).json({ error: 'Failed to leave queue' });
  }
}

// POST /api/queue/reset-demo (Reset demo queues to original state)
export function resetDemoQueues(req, res) {
  try {
    db.reset();
    return res.json({ message: 'Demo data reset successfully!' });
  } catch (err) {
    console.error('Error resetting demo data:', err);
    return res.status(500).json({ error: 'Failed to reset demo data' });
  }
}
