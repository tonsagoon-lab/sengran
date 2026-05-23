-- Add push notification token to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;

-- Enable Realtime on messages table (required for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
