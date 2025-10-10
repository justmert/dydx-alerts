# User model is no longer needed as Supabase Auth manages users
# User data is stored in Supabase's auth.users table
# We reference user_id as UUID in other tables pointing to auth.users(id)
