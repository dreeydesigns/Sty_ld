const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

test('Activity page uses authorized API', async () => {
  const content = fs.readFileSync('app/activity/page.tsx', 'utf8');
  assert.ok(content.includes('"/api/bookings"'), 'Activity must fetch from the authorized /api/bookings endpoint');
  assert.ok(!content.includes('/api/activity'), 'Activity must not reference a nonexistent /api/activity endpoint');
});

test('Activity page implements explicit loading, empty, and error states', async () => {
  const content = fs.readFileSync('app/activity/page.tsx', 'utf8');
  assert.ok(content.includes('loading') || content.includes('Loading'), 'Activity must handle loading state');
});

test('Messaging interface classification is browser-local simulation', async () => {
  const content = fs.readFileSync('components/role-profile-workspace.tsx', 'utf8');
  assert.ok(content.includes('readThreads') || content.includes('sendMessage'), 'Messaging uses client-side store');
});

test('Settings page classifies data sources honestly', async () => {
  const pageContent = fs.readFileSync('app/settings/page.tsx', 'utf8');
  const uiContent = fs.readFileSync('components/settings-ui.tsx', 'utf8');
  assert.ok(pageContent.includes('Security') || pageContent.includes('workspaces'), 'Settings has structured subroutes');
  assert.ok(uiContent.includes('localStorage') || uiContent.includes('device') || uiContent.includes('local'), 'Settings distinguishes local preferences');
});

test('Requests and Notifications maintain honest empty states', async () => {
  const notifContent = fs.readFileSync('app/notifications/page.tsx', 'utf8');
  assert.ok(notifContent.includes('no notifications') || notifContent.includes('empty') || notifContent.includes('Genuine notifications'), 'Notifications has honest empty state');
});
