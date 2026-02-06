# TODO: Fix Next.js 15 Build Errors

## Completed Tasks
- [x] Update dynamic API routes to await params in Next.js 15
  - Fixed app/api/comments/[id]/route.ts (PUT, DELETE)
  - Fixed app/api/tasks/[id]/route.ts (GET, PUT, DELETE)
  - Fixed app/api/documents/[id]/route.ts
  - Fixed app/api/notifications/[id]/route.ts
  - Fixed app/api/projects/[id]/route.ts
  - Fixed app/api/reminders/[id]/route.ts
  - Fixed app/api/responses/[id]/route.ts
  - Fixed nested routes: projects/[id]/members/[userId]/route.ts, tasks/[id]/assignees/[userId]/route.ts, etc.
- [x] Create missing route.ts files for API endpoints
  - email_confirmations/route.ts
  - email_logs/route.ts
  - project_members/route.ts
  - reports/route.ts
  - task_assignees/route.ts
  - task_reminders/route.ts
  - task_responses/route.ts
  - user_settings/route.ts
- [x] Fix auth usage in route handlers (changed authResult to user)
- [x] Update lib/permissions.ts with missing resources and permissions
- [x] Create SupabaseTaskRepository with required methods (createMany, findById, save)
- [x] Update TaskRepository interface with findById and save methods
- [x] Fix import paths in TaskGenerationService.ts and ValidateStage.ts
- [x] Create NotificationPort interface
- [x] Fix TaskGenerationService to use project_id instead of projectId
- [x] Fix JWT signing type error in lib/auth.ts
- [x] Create app/page.tsx with React component to resolve build optimization error
- [x] Update tsconfig.json jsx to "react-jsx"
- [x] Remove conflicting src/pages directory to allow app router

## Verification
- [ ] Run npm run build and confirm success
- [ ] Check for any remaining TypeScript errors
- [ ] Test API endpoints if needed
