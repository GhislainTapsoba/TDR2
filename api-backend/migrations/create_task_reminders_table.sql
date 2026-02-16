-- Create task_reminders table
CREATE TABLE task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reminder_type VARCHAR(50) NOT NULL, -- 'due_soon', 'due_very_soon', 'overdue'
    urgency VARCHAR(20) NOT NULL -- 'low', 'medium', 'high', 'critical'
);

-- Create indexes for better performance
CREATE INDEX idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX idx_task_reminders_sent_at ON task_reminders(sent_at);
CREATE INDEX idx_task_reminders_type ON task_reminders(reminder_type);
