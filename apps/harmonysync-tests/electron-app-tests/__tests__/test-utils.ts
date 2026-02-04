import fs from 'fs-extra';
import path from 'path';

const tempDirs: string[] = [];
const trackedServices: Array<{ dispose?: () => Promise<void> | void }> = [];

export async function createTempDir(prefix = 'test-'): Promise<string> {
  const dir = await fs.mkdtemp(path.join((process.env.TMPDIR || '/tmp'), prefix));
  tempDirs.push(dir);
  return dir;
}

export function trackService(svc: { dispose?: () => Promise<void> | void } | null | undefined) {
  if (svc) trackedServices.push(svc);
}

export async function cleanupAll(): Promise<void> {
  for (let i = trackedServices.length - 1; i >= 0; i--) {
    const s = trackedServices[i];
    try {
      if (s && typeof s.dispose === 'function') {
        await Promise.resolve(s.dispose());
      }
    } catch (err) {
      // ignore
    }
  }

  for (const d of tempDirs) {
    try {
      await fs.remove(d);
    } catch (err) {
      // ignore
    }
  }

  tempDirs.length = 0;
  trackedServices.length = 0;

  try { jest.useRealTimers(); } catch {}
  try { jest.resetAllMocks(); } catch {}
  try { jest.resetModules(); } catch {}
}

export default {
  createTempDir,
  trackService,
  cleanupAll,
};
