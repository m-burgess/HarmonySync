import { JsonStorageProvider } from '../src/json-storage';
import { promises as fs } from 'fs';
import path from 'path';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
  },
}));

describe('JsonStorageProvider', () => {
  const basePath = '/test/storage';
  let storage: JsonStorageProvider;
  const fsMock = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new JsonStorageProvider(basePath);
  });

  test('should initialize by creating directory', async () => {
    fsMock.mkdir.mockResolvedValue(undefined);
    await storage.initialize();
    expect(fsMock.mkdir).toHaveBeenCalledWith(basePath, { recursive: true });
  });

  test('should read collection', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    fsMock.readFile.mockResolvedValue(JSON.stringify(mockData));
    fsMock.mkdir.mockResolvedValue(undefined);

    const result = await storage.read('items');
    
    expect(fsMock.readFile).toHaveBeenCalledWith(path.join(basePath, 'items.json'), 'utf-8');
    expect(result).toEqual(mockData);
  });

  test('should return empty array if collection does not exist', async () => {
    fsMock.readFile.mockRejectedValue({ code: 'ENOENT' });
    fsMock.mkdir.mockResolvedValue(undefined);

    const result = await storage.read('nonexistent');
    expect(result).toEqual([]);
  });

  test('should write collection', async () => {
    const data = [{ id: '1', name: 'Test' }];
    fsMock.writeFile.mockResolvedValue(undefined);
    fsMock.mkdir.mockResolvedValue(undefined);

    await storage.write('items', data);
    
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      path.join(basePath, 'items.json'),
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  });

  test('should check if collection exists', async () => {
    fsMock.access.mockResolvedValue(undefined);
    fsMock.mkdir.mockResolvedValue(undefined);

    const exists = await storage.exists('items');
    expect(exists).toBe(true);
    expect(fsMock.access).toHaveBeenCalledWith(path.join(basePath, 'items.json'));
  });

  test('should return false if collection does not exist', async () => {
    fsMock.access.mockRejectedValue(new Error('ENOENT'));
    fsMock.mkdir.mockResolvedValue(undefined);

    const exists = await storage.exists('items');
    expect(exists).toBe(false);
  });

  test('should delete collection', async () => {
    fsMock.unlink.mockResolvedValue(undefined);
    fsMock.mkdir.mockResolvedValue(undefined);

    await storage.deleteCollection('items');
    expect(fsMock.unlink).toHaveBeenCalledWith(path.join(basePath, 'items.json'));
  });

  test('should list collections', async () => {
    fsMock.readdir.mockResolvedValue(['items.json', 'users.json', 'other.txt'] as any);
    fsMock.mkdir.mockResolvedValue(undefined);

    const collections = await storage.listCollections();
    expect(collections).toEqual(['items', 'users']);
    expect(fsMock.readdir).toHaveBeenCalledWith(basePath);
  });
});
