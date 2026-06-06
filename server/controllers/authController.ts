import { Request, Response } from 'express';
import { supabase } from '../../src/lib/supabaseClient';
import { DB } from '../data/manager';
import { getCustomerFromToken } from '../lib/auth';
import { authenticateAdmin, signAdminToken, verifyAdminToken } from '../lib/adminAuth';
import { Customer } from '../../src/types';

export const AuthController = {
  /**
   * Register a new customer via Supabase Auth + customers profile table
   */
  async register(req: Request, res: Response): Promise<void> {
    const {
      fullName,
      email,
      password,
      phone,
      dob,
      address,
      emergencyContactName,
      emergencyContactPhone,
      acceptTerms
    } = req.body;

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      res.status(400).json({ error: 'Full name must be at least 3 characters long.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      res.status(400).json({
        error: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number.'
      });
      return;
    }

    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      res.status(400).json({ error: 'Please provide a valid Philippine mobile number (e.g., 09123456789 or +639123456789).' });
      return;
    }

    if (!dob) {
      res.status(400).json({ error: 'Date of birth is required for adventure activity waiver validation.' });
      return;
    }

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 5) {
      res.status(400).json({ error: 'Invalid Date of Birth. Customer must be at least 5 years old.' });
      return;
    }

    if (!address || address.trim().length < 5) {
      res.status(400).json({ error: 'Please enter a complete residential address.' });
      return;
    }

    if (!emergencyContactName || emergencyContactName.trim().length < 3) {
      res.status(400).json({ error: 'Emergency contact name is required.' });
      return;
    }

    if (!emergencyContactPhone || !phoneRegex.test(emergencyContactPhone)) {
      res.status(400).json({ error: 'Emergency contact phone must be a valid mobile number.' });
      return;
    }

    if (phone === emergencyContactPhone) {
      res.status(400).json({ error: 'Your mobile number and emergency contact number cannot be identical.' });
      return;
    }

    if (!acceptTerms) {
      res.status(400).json({ error: 'You must accept the MW Adventure Park terms and conditions and river safety waivers to register.' });
      return;
    }

    try {
      const phoneExists = await DB.isPhoneRegistered(phone);
      if (phoneExists) {
        res.status(400).json({ error: 'An account with this phone number already exists.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName.trim() }
        }
      });

      if (authError) {
        const message = authError.message.toLowerCase();
        if (message.includes('already registered') || message.includes('already been registered')) {
          res.status(400).json({ error: 'An account with this email address already exists.' });
          return;
       } else if (message.includes('email not allowed')) {
        res.status(400).json({ error: 'Email not allowed. Please contact support.' });
        return;
        }
       /**
        if (authError.code === 'over_email_send_rate_limit') {
          res.status(429).json({ error: 'Too many sign-up attempts. Please wait a few minutes and try again.' });
          return;
        }
          */
        console.error('Supabase signUp error:', authError);
        res.status(400).json({ error: authError.message });
        return;
      }

      if (!authData.user) {
        res.status(500).json({ error: 'Failed to create account. Please try again.' });
        return;
      }

      if (authData.session) {
        await supabase.auth.setSession(authData.session);
      }

      const { error: profileError } = await DB.createCustomerProfile({
        id: authData.user.id,
        fullName: fullName.trim(),
        phone,
        dob,
        address: address.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone
      });

      if (profileError) {
        res.status(500).json({ error: `Account created but profile save failed: ${profileError}` });
        return;
      }

      await DB.logSecurity(authData.user.id, 'User Registration', ip, true);

      const newCustomer: Customer = {
        id: authData.user.id,
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone,
        dob,
        address: address.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone,
        createdAt: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        message: authData.session
          ? 'Registration successful! You can now log in to manage your bookings.'
          : 'Registration successful! Please check your email to confirm your account before logging in.',
        customer: newCustomer
      });
    } catch (error: unknown) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal system error. Failed to complete registration.' });
    }
  },

  /**
   * Log in a customer via Supabase Auth
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both your email address and password.' });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error || !data.user || !data.session) {
        await DB.logSecurity(null, `Failed Login Attempt (Email: ${email})`, ip, false);
        res.status(401).json({ error: 'Invalid email address or password. Please try again.' });
        return;
      }

      const customer = await DB.getCustomerById(data.user.id, data.user.email || '');
      if (!customer) {
        res.status(401).json({ error: 'Account profile not found. Please contact support.' });
        return;
      }

      await DB.logSecurity(data.user.id, 'User Login Success', ip, true);

      res.status(200).json({
        success: true,
        message: `Welcome back, ${customer.fullName}!`,
        token: data.session.access_token,
        customer
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal system error during authentication.' });
    }
  },

  /**
   * Validate session token and return user profile
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const customer = await getCustomerFromToken(req.headers.authorization);

    if (!customer) {
      res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
      return;
    }

    res.status(200).json({
      success: true,
      customer
    });
  },

  /**
   * Authenticate an admin or staff operator
   */
  async adminLogin(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const session = authenticateAdmin(username, password);
    if (!session) {
      await DB.logAdminAction(username, 'Failed login attempt', ip, false);
      res.status(401).json({ error: 'Invalid admin credentials.' });
      return;
    }

    const token = signAdminToken(session);
    await DB.logAdminAction(session.username, `Login (${session.role})`, ip, true);

    res.status(200).json({
      success: true,
      message: `Welcome, ${session.username}.`,
      token,
      admin: session,
    });
  },

  /**
   * Validate admin session token
   */
  async adminMe(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) {
      res.status(401).json({ error: 'Admin session expired or invalid.' });
      return;
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      res.status(401).json({ error: 'Admin session expired or invalid.' });
      return;
    }

    res.status(200).json({ success: true, admin });
  },

  /**
   * Terminate admin session
   */
  async adminLogout(req: Request, res: Response): Promise<void> {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    const admin = token ? verifyAdminToken(token) : null;

    if (admin) {
      await DB.logAdminAction(admin.username, 'Logout', ip, true);
    }

    res.status(200).json({ success: true, message: 'Admin session closed.' });
  },

  /**
   * Terminate user session
   */
  async logout(req: Request, res: Response): Promise<void> {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
    const customer = await getCustomerFromToken(req.headers.authorization);

    if (customer) {
      await DB.logSecurity(customer.id, 'User Logout', ip, true);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  }
};
