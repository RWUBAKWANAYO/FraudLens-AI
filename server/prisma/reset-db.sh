#!/bin/bash
set -e

# Default embedding dimension and distance
EMBEDDING_DIM=${EMBEDDING_DIM:-384}   # 384 for OpenAI, 1105 for local AI
DISTANCE=${DISTANCE:-COSINE}          # COSINE, L2, IP

echo "Resetting database..."
npx prisma migrate reset --force

echo "Clearing old migrations..."
rm -rf prisma/migrations/*

echo "Creating new migration..."
npx prisma migrate dev --name init --create-only

echo "Applying migration..."
npx prisma migrate dev

echo "Applying TiDB-specific SQL (VECTOR dim = $EMBEDDING_DIM, DISTANCE = $DISTANCE)..."

cat > prisma/tidb.sql <<EOL
-- TiDB Vector Support
ALTER TABLE \`Record\` 
  ADD COLUMN IF NOT EXISTS \`embeddingVec\` VECTOR($EMBEDDING_DIM) NULL;

-- Add vector index with chosen distance metric
ALTER TABLE \`Record\` 
  ADD VECTOR INDEX IF NOT EXISTS idx_record_embedding_vec (\`embeddingVec\`) USING $DISTANCE;

-- Extra useful indexes
CREATE INDEX IF NOT EXISTS idx_record_company_date 
  ON \`Record\` (companyId, date);

CREATE INDEX IF NOT EXISTS idx_record_company_partner 
  ON \`Record\` (companyId, partner);
EOL

npx prisma db execute --file prisma/tidb.sql --schema prisma/schema.prisma

echo "✅ Database reset complete! VECTOR dim = $EMBEDDING_DIM, DISTANCE = $DISTANCE"
