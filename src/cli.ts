import 'reflect-metadata';

import * as fs from 'fs';

import { program } from 'commander';
import { container } from 'tsyringe';
import * as winston from 'winston';

import { chalkFormatter } from './chalk-formatter';
import { Config, defaultConfig, loadConfig } from './config';
import { SimpleGitUtils } from './utils/git.utils';
import { FsFileSystemUtils } from './utils/file-system.utils';
import { CheckerResults, ForbiddenTokensChecker, LockfileVersionChecker } from './checkers';

const logger = winston.createLogger({
  level: 'info',
  format: chalkFormatter,
  transports: [new winston.transports.Console({ format: chalkFormatter })],
});

container.register('Logger', { useValue: logger });
container.register('GitUtils', { useClass: SimpleGitUtils });
container.register('FileSystemUtils', { useClass: FsFileSystemUtils });

program.name('rug-hooks').description('CLI utility to bundle up and run some ReallyUsefulGit-Hooks').version('0.1.0');

program
  .command('init')
  .argument('[path]', 'Path to where the config file should be created', './.rughooksrc.json')
  .description('Create a new config file with some sensible defaults')
  .action((path: string) => {
    if (fs.existsSync(path)) {
      return;
    }
    fs.writeFileSync(path, JSON.stringify(defaultConfig, null, 2));
  });

program
  .command('run')
  .argument('[config]', 'Path to config file in relation to git root', './.rughooksrc.json')
  .option('-d, --debug', 'Set logging level to debug, use this if stuff starts going wrong')
  .description('Runs the checkers using the options from the config')
  .action(async (configPath: string, options) => {
    if (options.debug) {
      logger.level = 'debug';
    }
    let previousDir = process.cwd();
    while (!fs.existsSync('.git')) {
      try {
        process.chdir('../');
        if (process.cwd() === previousDir) {
          logger.error('Could not navigate to git root');
          process.exit(1);
        }
        previousDir = process.cwd();
      } catch (err) {
        logger.error('Could not navigate to git root');
        process.exit(1);
      }
    }

    const config = loadConfig(configPath, logger);

    let exitCode = 0;
    const results: Array<CheckerResults> = [];

    if (config.forbiddenTokens) {
      const forbiddenTokensChecker = container.resolve(ForbiddenTokensChecker);
      results.push(await forbiddenTokensChecker.run(config.forbiddenTokens));
    }
    if (config.lockfile) {
      const lockfileVersionChecker = container.resolve(LockfileVersionChecker);
      results.push(await lockfileVersionChecker.run(config.lockfile));
    }

    results.forEach((result) => {
      if (result.success) {
        return;
      }
      logger.info(result.name);
      if (result.fails) {
        exitCode += result.fails.length;
        result.fails.forEach(logger.warn);
      } else {
        exitCode += 1;
      }
    });
    process.exit(exitCode);
  });
program.parse();
