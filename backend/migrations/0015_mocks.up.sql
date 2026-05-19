CREATE TABLE IF NOT EXISTS full_mocks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'OTHER',
    provider_name TEXT NOT NULL DEFAULT '',
    test_name TEXT NOT NULL,
    date TEXT NOT NULL,
    varc_score INT,
    varc_attempted INT,
    varc_correct INT,
    varc_percentile DOUBLE PRECISION,
    dilr_score INT,
    dilr_attempted INT,
    dilr_correct INT,
    dilr_percentile DOUBLE PRECISION,
    quant_score INT,
    quant_attempted INT,
    quant_correct INT,
    quant_percentile DOUBLE PRECISION,
    overall_score INT,
    overall_percentile DOUBLE PRECISION,
    duration_min INT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    linked_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sectional_tests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'OTHER',
    provider_name TEXT NOT NULL DEFAULT '',
    test_name TEXT NOT NULL,
    section TEXT NOT NULL,
    date TEXT NOT NULL,
    score INT,
    attempted INT,
    correct INT,
    percentile DOUBLE PRECISION,
    duration_min INT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    linked_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qotd_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    topic TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    correct BOOLEAN NOT NULL,
    time_taken_sec INT,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
