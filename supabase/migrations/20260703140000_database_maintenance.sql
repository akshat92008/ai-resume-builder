-- Database maintenance: GIN indexes and pgvector setup

-- 1. Create pgvector extension
create extension if not exists vector;

-- 2. Create GIN indexes for JSONB columns for faster query performance
create index if not exists idx_career_profiles_json on public.career_profiles using gin (profile);
create index if not exists idx_resume_documents_json on public.resume_documents using gin (document);
create index if not exists idx_application_packs_json on public.application_packs using gin (pack);
create index if not exists idx_job_search_insights_json on public.job_search_insights using gin (insight);
create index if not exists idx_career_experience_docs_json on public.career_experience using gin (documents);

-- 3. Set up Career Embeddings for RAG (Retrieval-Augmented Generation)
create table if not exists public.career_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  embedding vector(1536), -- OpenAI standard size
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.career_embeddings enable row level security;

-- Policies
create policy "Users can manage their own embeddings" 
  on public.career_embeddings for all 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

-- HNSW Index for fast vector similarity search
create index if not exists idx_career_embeddings_hnsw 
  on public.career_embeddings 
  using hnsw (embedding vector_cosine_ops);

-- Add GIN index for metadata on embeddings
create index if not exists idx_career_embeddings_metadata 
  on public.career_embeddings using gin (metadata);
