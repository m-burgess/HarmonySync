// Jest setup file
global.jest = {
  fn: () => {
    const mockFn = (...args) => {
      mockFn.calls.push(args);
      mockFn.callCount++;
      if (mockFn.implementation) {
        return mockFn.implementation(...args);
      }
    };
    mockFn.calls = [];
    mockFn.callCount = 0;
    mockFn.implementation = null;
    mockFn.mockImplementation = (fn) => {
      mockFn.implementation = fn;
      return mockFn;
    };
    return mockFn;
  },
  spyOn: (object, method) => {
    const original = object[method];
    const spy = global.jest.fn();
    spy.mockRestore = () => {
      object[method] = original;
    };
    object[method] = spy;
    return spy;
  }
};
