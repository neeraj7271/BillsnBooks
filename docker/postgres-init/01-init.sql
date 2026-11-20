-- Initialize extensions required by the accounting platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Notice indicating database bootstrap complete
DO $$
BEGIN
  RAISE NOTICE 'Accounting Platform PostgreSQL extensions initialized successfully.';
END $$;

