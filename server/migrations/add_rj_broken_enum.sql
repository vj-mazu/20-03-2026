-- Migration to add 'RJ Broken' to the rice_productions productType ENUM
-- Run this script to fix the "RJ Broken" save error

-- Add 'RJ Broken' to the enum type
ALTER TYPE "enum_rice_productions_productType" ADD VALUE IF NOT EXISTS 'RJ Broken';

-- Verify the change
SELECT unnest(enum_range(NULL::enum_rice_productions_productType));
