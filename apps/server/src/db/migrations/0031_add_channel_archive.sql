-- Add channel archive support
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS archived_by VARCHAR(36);

-- Create index for archived channels lookup
CREATE INDEX IF NOT EXISTS idx_channels_archived ON channels(server_id, is_archived, archived_at) WHERE is_archived = TRUE;
