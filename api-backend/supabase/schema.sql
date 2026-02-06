-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    role_id UUID REFERENCES roles(id),
    password VARCHAR(255),
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50),
    language VARCHAR(10),
    notifications JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_task_assigned BOOLEAN DEFAULT TRUE,
    email_task_updated BOOLEAN DEFAULT TRUE,
    email_task_due BOOLEAN DEFAULT TRUE,
    email_stage_completed BOOLEAN DEFAULT FALSE,
    email_project_created BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    daily_summary BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'PLANNING',
    created_by_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages table
CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    duration INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'TODO',
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    refusal_reason TEXT
);

-- Task assignees junction table
CREATE TABLE task_assignees (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

-- Project members junction table
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email logs table
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT
);

-- Email confirmations table
CREATE TABLE email_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(100),
    entity_id UUID,
    metadata JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    data JSONB,
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task reminders table
CREATE TABLE task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task responses table
CREATE TABLE task_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    response TEXT,
    response_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('admin', 'Administrator with full access'),
('manager', 'Project manager'),
('employee', 'Regular employee');

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('users.read', 'Read users', 'users', 'read'),
('users.create', 'Create users', 'users', 'create'),
('users.update', 'Update users', 'users', 'update'),
('users.delete', 'Delete users', 'users', 'delete'),
('projects.read', 'Read projects', 'projects', 'read'),
('projects.create', 'Create projects', 'projects', 'create'),
('projects.update', 'Update projects', 'projects', 'update'),
('projects.delete', 'Delete projects', 'projects', 'delete'),
('tasks.read', 'Read tasks', 'tasks', 'read'),
('tasks.create', 'Create tasks', 'tasks', 'create'),
('tasks.update', 'Update tasks', 'tasks', 'update'),
('tasks.delete', 'Delete tasks', 'tasks', 'delete'),
('stages.read', 'Read stages', 'stages', 'read'),
('stages.create', 'Create stages', 'stages', 'create'),
('stages.update', 'Update stages', 'stages', 'update'),
('stages.delete', 'Delete stages', 'stages', 'delete');

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

-- Assign some permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource IN ('projects', 'tasks', 'stages');

-- Assign basic permissions to employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.action = 'read';
