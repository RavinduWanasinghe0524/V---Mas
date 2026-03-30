-- ============================================================
-- Migration: Add audit tracking columns to fuel_logs table
-- Run this ONCE against your existing database before restarting
-- the Spring Boot backend.
-- ============================================================

ALTER TABLE fuel_logs
    ADD COLUMN IF NOT EXISTS is_updated  BOOLEAN  NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at  DATETIME NULL,
    ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN  NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at  DATETIME NULL;
