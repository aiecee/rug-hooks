import 'reflect-metadata';

import { container } from 'tsyringe';

import { LockfileVersionChecker } from './lockfile-version.checker';

fdescribe('Lockfile Version Checker', () => {
  let exists: jest.Mock;
  let readFile: jest.Mock;
  let lockfileVersionChecker: LockfileVersionChecker;

  let fileSystemUtils: any;

  beforeAll(() => {
    exists = jest.fn();
    readFile = jest.fn();
    fileSystemUtils = { exists, readFile };
  });

  beforeEach(() => {
    exists.mockReset();
    readFile.mockReset();

    container.clearInstances();
    container.registerInstance('FileSystemUtils', fileSystemUtils);

    lockfileVersionChecker = container.resolve(LockfileVersionChecker);
  });

  it('should return success with valid lock file', async () => {
    exists.mockImplementation((path: string) => true);
    readFile.mockImplementation((path: string) => '{ "lockfileVersion": 2 }');

    const results = await lockfileVersionChecker.run();
    expect(results.success).toBe(true);
    expect(results.fails).toBe(undefined);
  });

  it('should return fail with invalid lock file', async () => {
    exists.mockImplementation((path: string) => true);
    readFile.mockImplementation((path: string) => '{ "lockfileVersion": 1 }');

    const results = await lockfileVersionChecker.run();
    expect(results.success).toBe(false);
    expect(results.fails?.length).toBe(1);
  });

  it("should return success when lockfile doesn't exist", async () => {
    exists.mockImplementation((path: string) => false);

    const results = await lockfileVersionChecker.run();
    expect(results.success).toBe(true);
  });

  it('should return fail when lockfile is invalid', async () => {
    exists.mockImplementation((path: string) => true);
    readFile.mockImplementation((path: string) => '{ "lockfileVersion": 1 ');

    const results = await lockfileVersionChecker.run();
    expect(results.success).toBe(false);
    expect(results.fails?.length).toBe(1);
  });
});
