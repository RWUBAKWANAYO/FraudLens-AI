-- TiDB Vector Support
ALTER TABLE `Record` ADD COLUMN IF NOT EXISTS `embeddingVec` VECTOR(384) NULL;

-- Add vector index with distance function
 echo "ALTER TABLE `Record` ADD VECTOR INDEX IF NOT EXISTS idx_record_embedding_cosine ((VEC_COSINE_DISTANCE(embeddingVec, embeddingVec)));";;
    L2)     echo "ALTER TABLE `Record` ADD VECTOR INDEX IF NOT EXISTS idx_record_embedding_cosine ((VEC_L2_DISTANCE(embeddingVec, embeddingVec)));";;
    IP)     echo "ALTER TABLE `Record` ADD VECTOR INDEX IF NOT EXISTS idx_record_embedding_cosine ((VEC_IP_DISTANCE(embeddingVec, embeddingVec)));";;
    *)      echo "SELECT 'Unknown DISTANCE type: COSINE';";;
esac )

-- Extra useful indexes
CREATE INDEX IF NOT EXISTS idx_record_company_date ON `Record` (companyId, date);
CREATE INDEX IF NOT EXISTS idx_record_company_partner ON `Record` (companyId, partner);
