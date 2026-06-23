import { Repository } from '../src/repository';
import { IStorageProvider } from '../src/interfaces';

describe('Repository', () => {
  let storageMock: jest.Mocked<IStorageProvider>;
  let repository: Repository<{ id: string; name: string }>;
  const collection = 'test_collection';

  beforeEach(() => {
    storageMock = {
      initialize: jest.fn(),
      read: jest.fn(),
      write: jest.fn(),
      exists: jest.fn(),
      deleteCollection: jest.fn(),
      listCollections: jest.fn(),
      close: jest.fn(),
    };
    repository = new Repository(collection, storageMock);
  });

  test('should get item by id', async () => {
    const mockItems = [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }];
    storageMock.read.mockResolvedValue(mockItems);

    const item = await repository.getById('1');
    expect(item).toEqual(mockItems[0]);
    expect(storageMock.read).toHaveBeenCalledWith(collection);
  });

  test('should return null if item not found by id', async () => {
    storageMock.read.mockResolvedValue([]);
    const item = await repository.getById('999');
    expect(item).toBeNull();
  });

  test('should get all items', async () => {
    const mockItems = [{ id: '1', name: 'Item 1' }];
    storageMock.read.mockResolvedValue(mockItems);

    const items = await repository.getAll();
    expect(items).toEqual(mockItems);
  });

  test('should query items', async () => {
    const mockItems = [
      { id: '1', name: 'Apple' },
      { id: '2', name: 'Banana' },
      { id: '3', name: 'Apricot' }
    ];
    storageMock.read.mockResolvedValue(mockItems);

    const results = await repository.query(item => item.name.startsWith('A'));
    expect(results).toHaveLength(2);
    expect(results).toContainEqual(mockItems[0]);
    expect(results).toContainEqual(mockItems[2]);
  });

  test('should create new item', async () => {
    storageMock.read.mockResolvedValue([]);
    storageMock.write.mockResolvedValue(undefined);

    const id = await repository.create({ name: 'New Item' });
    
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(storageMock.write).toHaveBeenCalledWith(collection, [
      { id, name: 'New Item' }
    ]);
  });

  test('should create item with provided id', async () => {
    storageMock.read.mockResolvedValue([]);
    storageMock.write.mockResolvedValue(undefined);

    const id = await repository.create({ id: 'custom-id', name: 'New Item' });
    
    expect(id).toBe('custom-id');
    expect(storageMock.write).toHaveBeenCalledWith(collection, [
      { id: 'custom-id', name: 'New Item' }
    ]);
  });

  test('should throw error if creating item with duplicate id', async () => {
    storageMock.read.mockResolvedValue([{ id: 'dup', name: 'Existing' }]);

    await expect(repository.create({ id: 'dup', name: 'New' }))
      .rejects.toThrow('Entity with id dup already exists');
  });

  test('should update existing item', async () => {
    storageMock.read.mockResolvedValue([{ id: '1', name: 'Old Name' }]);
    storageMock.write.mockResolvedValue(undefined);

    await repository.update('1', { name: 'New Name' });
    
    expect(storageMock.write).toHaveBeenCalledWith(collection, [
      { id: '1', name: 'New Name' }
    ]);
  });

  test('should throw error when updating non-existent item', async () => {
    storageMock.read.mockResolvedValue([]);

    await expect(repository.update('999', { name: 'New' }))
      .rejects.toThrow('Entity with id 999 not found');
  });

  test('should delete item', async () => {
    storageMock.read.mockResolvedValue([{ id: '1', name: 'Item 1' }]);
    storageMock.write.mockResolvedValue(undefined);

    const result = await repository.delete('1');
    expect(result).toBe(true);
    expect(storageMock.write).toHaveBeenCalledWith(collection, []);
  });

  test('should return false when deleting non-existent item', async () => {
    storageMock.read.mockResolvedValue([{ id: '1', name: 'Item 1' }]);

    const result = await repository.delete('999');
    expect(result).toBe(false);
    expect(storageMock.write).not.toHaveBeenCalled();
  });

  test('should count items', async () => {
    storageMock.read.mockResolvedValue([
      { id: '1', name: 'A' },
      { id: '2', name: 'B' }
    ]);

    expect(await repository.count()).toBe(2);
    expect(await repository.count(item => item.name === 'A')).toBe(1);
  });
});
