-- schema.sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    picture TEXT,
    profile_picture_url TEXT,
    first_name TEXT,
    last_name TEXT,
    birth_date TEXT,
    dni TEXT,
    baptism_date TEXT,
    bio TEXT,
    profession TEXT,
    user_rank TEXT,
    nickname TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
