import express from 'express';
import {
  joinQueue,
  getDoctorQueue,
  getPatientQueue,
  callNextPatient,
  completeConsultation,
  skipPatient,
  leaveQueue,
  resetDemoQueues
} from '../controllers/queueController.js';

const router = express.Router();

// POST /api/queue/join - Patient joins queue
router.post('/join', joinQueue);

// GET /api/queue/patient/:patientId - Live queue for patient
router.get('/patient/:patientId', getPatientQueue);

// GET /api/queue/:doctorId - Live queue for doctor
router.get('/:doctorId', getDoctorQueue);

// POST /api/queue/call-next - Doctor calls next patient
router.post('/call-next', callNextPatient);

// POST /api/queue/complete - Doctor completes consultation
router.post('/complete', completeConsultation);

// POST /api/queue/skip - Doctor skips a patient
router.post('/skip', skipPatient);

// POST /api/queue/leave - Patient leaves queue
router.post('/leave', leaveQueue);

// POST /api/queue/reset - Reset demo data
router.post('/reset', resetDemoQueues);

export default router;
