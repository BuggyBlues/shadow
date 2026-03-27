-- Migration: Add agent dashboard tables
-- Created: 2025-03-27

-- Daily activity statistics for dashboard heatmap
CREATE TABLE IF NOT EXISTS agent_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message_count INTEGER DEFAULT 0 NOT NULL,
  online_seconds INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(agent_id, date)
);

-- Indexes for daily stats
CREATE INDEX idx_agent_daily_stats_agent_id ON agent_daily_stats(agent_id);
CREATE INDEX idx_agent_daily_stats_date ON agent_daily_stats(date);
CREATE INDEX idx_agent_daily_stats_agent_date ON agent_daily_stats(agent_id, date);

-- Hourly activity distribution for time-of-day analytics
CREATE TABLE IF NOT EXISTS agent_hourly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  message_count INTEGER DEFAULT 0 NOT NULL,
  activity_count INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(agent_id, hour_of_day)
);

-- Indexes for hourly stats
CREATE INDEX idx_agent_hourly_stats_agent_id ON agent_hourly_stats(agent_id);

-- Activity events for recent activity feed
CREATE TABLE IF NOT EXISTS agent_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for activity events
CREATE INDEX idx_agent_activity_events_agent_id ON agent_activity_events(agent_id);
CREATE INDEX idx_agent_activity_events_created_at ON agent_activity_events(created_at DESC);
CREATE INDEX idx_agent_activity_events_agent_created ON agent_activity_events(agent_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE agent_daily_stats IS 'Daily aggregated statistics for Buddy Dashboard heatmap';
COMMENT ON TABLE agent_hourly_stats IS 'Hourly activity distribution for time-of-day analytics';
COMMENT ON TABLE agent_activity_events IS 'Recent activity events for dashboard feed (kept for 90 days)';
