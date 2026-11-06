# AI University (MVP)
Working now: sign up/sign in, PDF/TXT upload to private storage, library (search, rename, delete), AI Teacher (questions with page citations, important questions, topic teaching in Hinglish/Hindi/English/Assamese), saved chat history.
Not built yet: DOCX/images, OCR for scanned PDFs, Research Lab, Exam Centre, Video Studio, Visual Lab, Notes, Progress, Settings.

## Setup
1. Create a free project at supabase.com. In SQL Editor, run supabase/schema.sql.
2. Authentication > Providers > Email: turn off "Confirm email" for easy testing.
3. Copy .env.example to .env.local and fill the Supabase URL + anon key (Project Settings > API) and your ANTHROPIC_API_KEY (console.anthropic.com).
4. npm install, then npm run dev, open http://localhost:3000.

## Go live (Vercel)
1. Push this folder to a GitHub repo.
2. vercel.com > Add New Project > import the repo > add the 4 variables from .env.example > Deploy.
3. Domain: Project > Settings > Domains > add your domain and set the DNS records Vercel shows.
Free Supabase limits uploads to 50 MB per file; split bigger books.
