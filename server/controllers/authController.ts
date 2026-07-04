import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabaseClient.js';
import { DB } from '../data/manager.js';
import { getCustomerFromToken } from '../lib/auth.js';
import { authenticateAdmin, signAdminToken, verifyAdminToken } from '../lib/adminAuth.js';
import { Customer } from '../../src/types.js';

const HASH_SECRET = process.env.HASH_SECRET || 'mw-adventure-park-secret-salt-2026';

export const AuthController = {
  /**
   * Register or log in a new/existing customer via guest details with passwordless authentication
   */
  async register(req: Request, res: Response): Promise<void> {
    const {
      fullName,
      email,
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

    const normalizedEmail = email.toLowerCase().trim();
    const guestPassword = crypto.createHmac('sha256', HASH_SECRET).update(normalizedEmail).digest('hex') + 'aA1!';

    try {
      // 1. First, check if the user is already registered by attempting to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: guestPassword
      });

      if (!signInError && signInData.user && signInData.session) {
        // User already exists and signed in successfully. Update their profile in the database with the new details
        await DB.createCustomerProfile({
          id: signInData.user.id,
          fullName: fullName.trim(),
          phone,
          dob,
          address: address.trim(),
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactPhone
        });

        const customer = await DB.getCustomerById(signInData.user.id, normalizedEmail);
        if (customer) {
          await DB.logSecurity(signInData.user.id, 'User Guest Login (Auto)', ip, true);
          res.status(200).json({
            success: true,
            message: `Welcome back, ${customer.fullName}!`,
            token: signInData.session.access_token,
            customer
          });
          return;
        }
      }

      // 2. If it's a new email, ensure phone is not already registered by someone else
      const phoneExists = await DB.isPhoneRegistered(phone);
      if (phoneExists) {
        res.status(400).json({ error: 'An account with this phone number already exists.' });
        return;
      }

      // 3. Register the new guest in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: guestPassword,
        options: {
          data: { full_name: fullName.trim() }
        }
      });

      if (authError) {
        console.error('Supabase signUp error:', authError);
        res.status(400).json({ error: authError.message });
        return;
      }

      if (!authData.user) {
        res.status(500).json({ error: 'Failed to create guest session.' });
        return;
      }

      // 4. Create customer profile details row in customers table
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
        res.status(500).json({ error: `Guest session created but profile save failed: ${profileError}` });
        return;
      }

      await DB.logSecurity(authData.user.id, 'User Guest Registration', ip, true);

      // 5. Sign the new guest in automatically to retrieve the session token
      const { data: finalSignIn, error: finalSignInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: guestPassword
      });

      if (finalSignInError || !finalSignIn.session) {
        res.status(500).json({ error: 'Failed to authenticate guest session after creation.' });
        return;
      }

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
        message: 'Guest check-in successful!',
        token: finalSignIn.session.access_token,
        customer: newCustomer
      });
    } catch (error: unknown) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal system error. Failed to complete registration.' });
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
