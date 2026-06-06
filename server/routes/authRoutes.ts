import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const authRouter = Router();

// Registration endpoint with verification rules
authRouter.post('/register', AuthController.register);

// Authentication endpoint
authRouter.post('/login', AuthController.login);

// Session recovery and profile loader
authRouter.get('/me', AuthController.getMe);

// Session destruction endpoint
authRouter.post('/logout', AuthController.logout);

// Admin authentication
authRouter.post('/admin/login', AuthController.adminLogin);
authRouter.get('/admin/me', AuthController.adminMe);
authRouter.post('/admin/logout', AuthController.adminLogout);

export default authRouter;
