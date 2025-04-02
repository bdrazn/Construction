import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common operations
export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
};

export const logActivity = async (action, targetType, targetId, details = {}) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;
  
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action_type: action,
      target_type: targetType,
      target_id: targetId,
      data_snapshot: details
    });
    
  if (error) console.error('Error logging activity:', error);
};
