import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

const authRouter = Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.get('/me', AuthController.getMe);
authRouter.post('/logout', AuthController.logout);
authRouter.post('/admin/login', AuthController.adminLogin);
authRouter.get('/admin/me', AuthController.adminMe);
authRouter.post('/admin/logout', AuthController.adminLogout);

export default authRouter;