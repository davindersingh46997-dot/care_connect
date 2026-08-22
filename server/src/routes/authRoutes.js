import express from 'express';
import { demoLogin, login, register } from '../controllers/authController.js';

const router = express.Router();

router.post('/demo-login', demoLogin);
router.post('/login', login);
router.post('/register', register);

export default router;
