-- NOTE:
-- This migration was an accidental full-schema rebaseline that duplicated objects
-- already created by migrations 0000-0019 and caused startup failures such as:
--   relation/type already exists
-- Keep this file as a no-op so migration ordering remains stable across environments.

-- no-op
SELECT 1;
