PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  name TEXT,
  version TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  action TEXT,
  stage TEXT NOT NULL,
  status TEXT,
  detail TEXT,
  progress_current INTEGER,
  progress_total INTEGER,
  started_at TEXT,
  updated_at TEXT NOT NULL,
  finished_at TEXT,
  payload_json TEXT,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  stage TEXT,
  detail TEXT,
  created_at TEXT NOT NULL,
  payload_json TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  size INTEGER,
  content_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shares (
  token_hash TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_machine_updated ON jobs(machine_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_project_updated ON jobs(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_job_created ON events(job_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_artifacts_job_created ON artifacts(job_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_shares_job ON shares(job_id);
