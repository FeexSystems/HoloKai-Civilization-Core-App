-- HoloKai Civilization Canon schema (PostgreSQL + pgvector)
-- Phase-1 reference schema for managed Postgres deployment.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS source_records (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  canonical_url TEXT,
  doi TEXT,
  region TEXT,
  era TEXT,
  language TEXT,
  evidence_type TEXT,
  peer_reviewed BOOLEAN,
  rights_status TEXT NOT NULL,
  access_status TEXT NOT NULL,
  custodian_notes TEXT,
  content_hash TEXT NOT NULL,
  editorial_status TEXT NOT NULL DEFAULT 'staged',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_passages (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  passage_idx INT NOT NULL,
  text TEXT NOT NULL,
  tokens INT,
  language TEXT,
  embedding vector(768),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source_id, passage_idx)
);

CREATE INDEX IF NOT EXISTS idx_source_passages_source_id ON source_passages(source_id);
CREATE INDEX IF NOT EXISTS idx_source_passages_embedding_ivfflat
  ON source_passages USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS entities (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS relationships (
  id BIGSERIAL PRIMARY KEY,
  subject_entity_id BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  object_entity_id BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  predicate TEXT NOT NULL,
  source_id BIGINT REFERENCES source_records(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS claims (
  id BIGSERIAL PRIMARY KEY,
  claim_uid TEXT UNIQUE NOT NULL,
  text TEXT NOT NULL,
  uncertainty_status TEXT NOT NULL DEFAULT 'open',
  contestation_status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claim_citations (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_id BIGINT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  passage_id BIGINT REFERENCES source_passages(id) ON DELETE SET NULL,
  citation_uid TEXT NOT NULL,
  evidence_type TEXT,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(claim_id, citation_uid)
);

CREATE TABLE IF NOT EXISTS review_decisions (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES source_records(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  reviewer_id TEXT,
  reviewer_role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingest_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
