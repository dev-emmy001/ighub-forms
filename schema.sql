-- SQL script to create the referral_agents table.
-- Please run this script in your Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.referral_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    ref_code VARCHAR(100) UNIQUE NOT NULL,
    bank_details TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on referral_agents
ALTER TABLE public.referral_agents ENABLE ROW LEVEL SECURITY;

-- Add discount_closes_at column to forms table if it doesn't exist
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS discount_closes_at TIMESTAMP WITH TIME ZONE;

-- Add email response columns to forms table if they don't exist
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS send_email_response BOOLEAN DEFAULT FALSE;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS email_response_message TEXT DEFAULT '';

