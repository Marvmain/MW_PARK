import { supabase } from '../lib/supabaseClient';
import { DB } from '../data/manager';
import { Customer } from '../../src/types';

export async function getCustomerFromToken(authHeader: string | undefined): Promise<Customer | null> {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  const customer = await DB.getCustomerById(user.id, user.email || '');
  return customer;
}
