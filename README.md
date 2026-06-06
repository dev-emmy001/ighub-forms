# IGHub Forms

A modern, dynamic form builder and submission management platform built for Innovation Growth Hub (IGHub). It allows administrators to quickly create custom registration forms, set application deadlines with live countdown timers, and manage dynamic user submissions—all while automatically sending custom confirmation emails to applicants.

## Key Features

- **Dynamic Form Builder**: Admins can create forms using custom JSON schemas with multiple field types (text, email, select, etc.).
- **Submission Management**: Secure admin dashboard to view and manage user submissions and registration counts.
- **Automated Email Confirmations**: Automatically sends personalized email responses to registrants upon successful form submission.
- **Promoter/Affiliate Tracking**: Built-in support for tracking referrals and partner clicks via custom link parameters.
- **Live Countdowns**: Automatically disables submissions and displays a sticky countdown timer for forms with deadlines.
- **Robust Security**: Enforced route authentication, strict CORS policies, and automated header security (CSP, X-Frame-Options, X-Content-Type-Options) out of the box.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **UI/Styling**: [Tailwind CSS v4](https://tailwindcss.com), [Lucide React](https://lucide.dev)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL + Supabase SSR Authentication)
- **Email Delivery**: [Nodemailer](https://nodemailer.com) & [Resend](https://resend.com)
- **Language**: TypeScript


## Security Notes

- **Admin Routes**: All `/admin` pages and `/api/forms` routes are strictly protected by Supabase server-side authentication.
- **CORS**: Cross-Origin Resource Sharing is strictly limited to trusted origins (e.g., `https://ighub.ng`) via Next.js middleware headers.
- **Data Integrity**: Uses Supabase RLS (Row Level Security) combined with secure backend API handlers utilizing the Service Role Key safely on the server side.

## License

Internal use only for Innovation Growth Hub.
