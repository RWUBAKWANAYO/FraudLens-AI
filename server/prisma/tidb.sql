-- TiDB Vector Support
ALTER TABLE `Record` 
  ADD COLUMN IF NOT EXISTS `embeddingVec` VECTOR(384) NULL;

-- Add vector index with chosen distance metric
ALTER TABLE `Record` 
  ADD VECTOR INDEX IF NOT EXISTS idx_record_embedding_vec (`embeddingVec`) DISTANCE = 'COSINE';

-- Extra useful indexes
CREATE INDEX IF NOT EXISTS idx_record_company_date 
  ON `Record` (companyId, date);

CREATE INDEX IF NOT EXISTS idx_record_company_partner 
  ON `Record` (companyId, partner);
