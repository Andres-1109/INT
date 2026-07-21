/*
  FILE: src/routes/auth.ts
*/

import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { validateBody } from '../middleware/validateBody.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

export default router;
