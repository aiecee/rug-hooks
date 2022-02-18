import 'reflect-metadata';

import { container } from 'tsyringe';

import { ForbiddenTokensChecker } from './forbidden-tokens.checker';

describe('Forbidden Tokens Checker', () => {
  let getStagedChanges: jest.Mock;
  let exists: jest.Mock;
  let readFile: jest.Mock;
  let forbiddenTokenChecker: ForbiddenTokensChecker;

  let gitUtils: any;
  let fileSystemUtils: any;

  beforeAll(() => {
    getStagedChanges = jest.fn();
    gitUtils = { getStagedChanges };

    exists = jest.fn();
    readFile = jest.fn();
    fileSystemUtils = { exists, readFile };
  });

  beforeEach(() => {
    getStagedChanges.mockReset();
    exists.mockReset();
    readFile.mockReset();

    container.clearInstances();
    container.registerInstance('GitUtils', gitUtils);
    container.registerInstance('FileSystemUtils', fileSystemUtils);

    forbiddenTokenChecker = container.resolve(ForbiddenTokensChecker);
  });

  it('should return errors on file with forbidden tokens', async () => {
    getStagedChanges.mockImplementation(() => ['tests.spec.ts']);
    exists.mockImplementation((_path: string) => true);
    readFile.mockImplementation(
      (_path: string) => `fdescribe("Some describe", () => {})
		fit("Some it", () => {})
		it.only("Some it only", () => {})
		describe.only("Some describe only", () => {})
		debugger;`,
    );

    const results = await forbiddenTokenChecker.run();
    expect(results.success).toBe(false);
    expect(results.fails?.length).toBe(4);
  });

  it('should return success on a file with no errors', async () => {
    getStagedChanges.mockImplementation(() => ['tests.spec.ts']);
    exists.mockImplementation((_path: string) => true);
    readFile.mockImplementation(
      (_path: string) => `describe("Some describe", () => {})
		it("Some it", () => {})`,
    );

    const results = await forbiddenTokenChecker.run();
    expect(results.success).toBe(true);
    expect(results.fails).toBe(undefined);
  });

  it("should not run if file doesn't exist", async () => {
    getStagedChanges.mockImplementation(() => ['tests.spec.ts']);
    exists.mockImplementation((_path: string) => false);

    const results = await forbiddenTokenChecker.run();
    expect(getStagedChanges).toHaveBeenCalledTimes(1);
    expect(exists).toHaveBeenCalledTimes(1);
    expect(readFile).not.toHaveBeenCalled();
    expect(results.success).toBe(true);
  });

  it('should ignore a rule if its option is false', async () => {
    getStagedChanges.mockImplementation(() => ['tests.spec.ts']);
    exists.mockImplementation((_path: string) => true);
    readFile.mockImplementation((_path: string) => 'fdescribe("Some describe", () => {})');

    const results = await forbiddenTokenChecker.run({ fdescribe: false });
    expect(results.success).toBe(true);
    expect(results.fails).toBe(undefined);
  });
});
