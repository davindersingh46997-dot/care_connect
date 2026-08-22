import express from 'express';
import {
  searchDoctors,
  getAllDoctors,
  getDoctorById,
  updateDoctorStatus,
  updateDoctorProfile
} from '../controllers/doctorController.js';

const router = express.Router();

// GET /api/doctors/search - Smart ranked search
router.get('/search', searchDoctors);

// GET /api/doctors - All doctors
router.get('/', getAllDoctors);

// GET /api/doctors/:id - Single doctor profile & queue
router.get('/:id', getDoctorById);

// PATCH /api/doctors/:id/status - Update clinic status
router.patch('/:id/status', updateDoctorStatus);

// PATCH /api/doctors/:id - Update profile details
router.patch('/:id', updateDoctorProfile);

export default router;
