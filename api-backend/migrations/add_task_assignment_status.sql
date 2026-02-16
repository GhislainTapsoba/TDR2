-- Add status column to task_assignees table
ALTER TABLE task_assignees 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL;

-- Add confirmation token column
ALTER TABLE task_assignees 
ADD COLUMN confirmation_token VARCHAR(255);

-- Add responded_at column
ALTER TABLE task_assignees 
ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance
CREATE INDEX idx_task_assignees_status ON task_assignees(status);
CREATE INDEX idx_task_assignees_token ON task_assignees(confirmation_token);
