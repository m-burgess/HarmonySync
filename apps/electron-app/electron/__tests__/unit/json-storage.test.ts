import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('JSONStorageService', () => {
  let tempDir: string;
  let JSONStorageService: any;

  beforeAll(async () => {
    tempDir = await createTempDir('js-');

    // Mock electron.app.getPath before requiring module
    jest.resetModules();
    jest.doMock('electron', () => ({ app: { getPath: () => tempDir } }));

    const mod = require('../../services/json-storage');
    JSONStorageService = mod.JSONStorageService;
  });

  afterAll(async () => {
    jest.dontMock('electron');
    await cleanupAll();
  });

  test('creates, updates, and deletes scheduled events', async () => {
    const svc = new JSONStorageService();
    // initialize will create storage and files
    await svc.initialize();

    const ev = await svc.createScheduledEvent({ title: 'T1' });
    expect(ev).toHaveProperty('id');

    const all = await svc.getAllScheduledEvents();
    expect(all.length).toBeGreaterThanOrEqual(1);

    const got = await svc.getScheduledEventById(ev.id);
    expect(got).not.toBeNull();

    const updated = await svc.updateScheduledEvent({ id: ev.id, title: 'Updated' });
    expect(updated).not.toBeNull();
    expect(updated.title).toBe('Updated');

    const deleted = await svc.deleteScheduledEvent(ev.id);
    expect(deleted).toBe(true);
  });

  test('getTodayEvents and getUpcomingEvents behavior', async () => {
    const svc = new JSONStorageService();
    await svc.initialize();

    const now = new Date().toISOString();
    const ev = await svc.createScheduledEvent({ title: 'Today', startTime: now });

    const today = await svc.getTodayEvents();
    expect(today.some((e: any) => e.id === ev.id)).toBe(true);

    const upcoming = await svc.getUpcomingEvents(72);
    expect(Array.isArray(upcoming)).toBe(true);
    expect(upcoming.some((e: any) => e.id === ev.id)).toBe(true);

    await svc.deleteScheduledEvent(ev.id);
  });
});
