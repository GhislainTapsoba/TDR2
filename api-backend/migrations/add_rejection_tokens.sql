-- Add token fields to task_rejections table
ALTER TABLE task_rejections 
ADD COLUMN IF NOT EXISTS token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_task_rejections_token ON task_rejections(token);

-- Create index for used status
CREATE INDEX IF NOT EXISTS idx_task_rejections_used ON task_rejections(used);
