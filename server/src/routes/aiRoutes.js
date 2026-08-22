import express from 'express';
import { handleSpecialtyClassification } from '../controllers/aiController.js';

const router = express.Router();

// POST /api/ai/specialty
router.post('/specialty', handleSpecialtyClassification);

export default router;
