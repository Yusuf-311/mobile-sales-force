#!/usr/bin/env bash
set -e

echo "=== Mobile Sales Force — PostgreSQL Setup Script ==="
echo ""

sudo -u postgres psql << 'SQL_END'
CREATE DATABASE msf_db;
CREATE USER msf_user WITH ENCRYPTED PASSWORD 'msf_password';
GRANT ALL PRIVILEGES ON DATABASE msf_db TO msf_user;
ALTER DATABASE msf_db OWNER TO msf_user;
SQL_END

echo "Applying schema (backend/db/schema.sql)..."
sudo -u postgres psql -d msf_db -f "/home/yusuf/Documents/Mobile Sales Force/backend/db/schema.sql"
sudo -u postgres psql -d msf_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO msf_user;"
sudo -u postgres psql -d msf_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO msf_user;"

echo "Creating backend/.env file..."
cat << 'ENV_END' > "/home/yusuf/Documents/Mobile Sales Force/backend/.env"
DATABASE_URL=postgresql://msf_user:msf_password@localhost:5432/msf_db
PORT=3000
ENV_END

echo "Seeding database..."
cd "/home/yusuf/Documents/Mobile Sales Force/backend"
node db/seed.js

echo ""
echo "✅ Setup finished successfully!"
