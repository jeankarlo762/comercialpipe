ALTER TABLE forms ADD COLUMN IF NOT EXISTS target_stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL;
