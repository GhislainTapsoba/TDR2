-- Create task_rejections table
CREATE TABLE task_rejections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_task_rejections_task_id ON task_rejections(task_id);
CREATE INDEX idx_task_rejections_user_id ON task_rejections(user_id);
CREATE INDEX idx_task_rejections_created_at ON task_rejections(created_at);
