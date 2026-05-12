-- Fix profile_picture column size to support base64 encoded images
-- This migration expands the profile_picture column from VARCHAR to LONGTEXT

USE vmas_db;

-- Modify the profile_picture column to LONGTEXT
ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT;

-- Verify the change
DESC users;
