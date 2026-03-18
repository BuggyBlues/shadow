-- Add sender information to notifications for avatar display
ALTER TABLE notifications
ADD COLUMN sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN sender_avatar_url TEXT;

-- Create index for faster lookups
CREATE INDEX idx_notifications_sender_id ON notifications(sender_id);
