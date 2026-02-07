const noop = () => {};

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(noop);
  jest.spyOn(console, 'info').mockImplementation(noop);
  jest.spyOn(console, 'warn').mockImplementation(noop);
});

afterAll(() => {
  jest.restoreAllMocks();
});
