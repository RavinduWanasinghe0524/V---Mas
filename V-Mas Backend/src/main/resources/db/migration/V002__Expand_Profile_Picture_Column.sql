-- Database migration: Expand profile_picture column to LONGTEXT
-- This allows storing large base64-encoded profile images

ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT;
