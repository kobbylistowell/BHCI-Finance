# BHCI Finance Management System

A church finance dashboard built with React, Vite, Supabase, and Lucide icons. It helps the BHCI finance team manage members, contributions, income, expenses, reporting, and financial accounts from a single admin dashboard.

## Features

- Dashboard overview for church financial activity
- Member management
- Tithe and income tracking
- Expense tracking
- Financial accounts management
- Reporting views
- Supabase authentication for secure access
- Forgot password and reset password flows

## Tech Stack

- React 19
- Vite
- JavaScript
- Supabase
- Lucide React

## Prerequisites

Before running the app locally, make sure you have:

- Node.js 18+
- npm
- A Supabase project

## Local setup

1. Clone the repository
2. Install dependencies:

   npm install

3. Create a local environment file:

   cp .env.example .env

4. Add your Supabase values:

   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

5. Start the development server:

   npm run dev

## Build for production

Run:

npm run build

This creates a production-ready bundle in the `dist/` directory.

## Deployment

This project is set up for deployment on Vercel.

### Vercel deployment steps

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Deploy the project.

### Optional: custom Vercel config

A `vercel.json` file can be added if needed for SPA fallback routing. This app is currently designed to run as a standard Vite client-side app.

## Project structure

- `src/App.jsx` — dashboard and app shell
- `src/pages/` — application pages
- `src/lib/supabaseClient.js` — Supabase client setup
- `public/` — static assets

## Notes

- The login and reset-password flows rely on Supabase Auth.
- Ensure your Supabase project config allows email auth and password recovery.
- If using production deployment, confirm your redirect URLs are configured in Supabase auth settings.
