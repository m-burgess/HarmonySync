import { FileManagerService } from '../../services/file-manager';
import * as fs from 'fs-extra';
import * as path from 'path';
import os from 'os';
import { createTempDir, trackService, cleanupAll } from '../test-utils';

describe('FileManagerService', () => {
  let tempDir: string;
  let svc: FileManagerService;

  beforeAll(async () => {
    tempDir = await createTempDir('fm-');
    svc = new FileManagerService();
    trackService(svc as any);
  });

  afterAll(async () => {
    await cleanupAll();
  });

  test('writeFile and readFile', async () => {
    const filePath = path.join(tempDir, 'test.txt');
    await svc.writeFile(filePath, 'hello');
    const content = await svc.readFile(filePath);
    expect(content).toBe('hello');
  });

  test('exists, mkdir, readDir, readDirDetailed', async () => {
    const dirPath = path.join(tempDir, 'sub');
    await svc.mkdir(dirPath);
    expect(await svc.exists(dirPath)).toBe(true);

    const f1 = path.join(dirPath, 'a.txt');
    const f2 = path.join(dirPath, 'b.txt');
    await svc.writeFile(f1, 'a');
    await svc.writeFile(f2, 'b');

    const entries = await svc.readDir(dirPath);
    expect(entries).toEqual(expect.arrayContaining(['a.txt', 'b.txt']));

    const detailed = await svc.readDirDetailed(dirPath);
    expect(detailed.find(e => e.name === 'a.txt')).toBeTruthy();
  });

  test('copyFile, moveFile, deleteFile', async () => {
    const src = path.join(tempDir, 'src.txt');
    const dest = path.join(tempDir, 'dest', 'copied.txt');
    const moved = path.join(tempDir, 'moved.txt');

    await svc.writeFile(src, 'x');
    await svc.copyFile(src, dest);
    expect(await svc.exists(dest)).toBe(true);

    await svc.moveFile(dest, moved);
    expect(await svc.exists(moved)).toBe(true);

    await svc.deleteFile(moved);
    expect(await svc.exists(moved)).toBe(false);
  });

  test('generateBackgroundCss creates file and returns css', async () => {
    const cssDir = path.join(tempDir, 'cssdir');
    const css = await svc.generateBackgroundCss(cssDir, { animationDuration: 1 });
    expect(typeof css).toBe('string');
    const cssPath = path.join(cssDir, 'background.css');
    expect(await fs.pathExists(cssPath)).toBe(true);
    const content = await fs.readFile(cssPath, 'utf8');
    expect(content).toBe(css);
  });
});
