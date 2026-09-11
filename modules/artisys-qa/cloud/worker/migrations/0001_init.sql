CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  name TEXT,
  version TEXT,
  status TEXT,
  stage TEXT,
  detail TEXT,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  machine_id TEXT,
  name TEXT,
  status TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  machine_id TEXT,
  project_id TEXT,
  action TEXT,
  stage TEXT,
  status TEXT,
  detail TEXT,
  progress_current INTEGER,
  progress_total INTEGER,
  flow TEXT,
  test TEXT,
  error TEXT,
  started_at TEXT,
  updated_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  machine_id TEXT,
  project_id TEXT,
  stage TEXT,
  detail TEXT,
  progress_current INTEGER,
  progress_total INTEGER,
  flow TEXT,
  test TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  type TEXT,
  name TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  size INTEGER,
  content_type TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_events_job_id ON events(job_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id, created_at DESC);
