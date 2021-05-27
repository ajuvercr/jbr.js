import * as fs from 'fs-extra';
import type { Argv } from 'yargs';
import type { ITaskContext } from '../../task/ITaskContext';
import { TaskInitialize } from '../../task/TaskInitialize';
import { wrapCommandHandler, wrapVisualProgress } from '../CliHelpers';
import { COLOR_YELLOW, withColor } from '../ColorUtils';
import { command as commandSetHook } from './CommandSetHook';

export const command = 'init <type> <name>';
export const desc = 'Initializes a new experiment';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .options({
      target: { type: 'string', describe: 'Experiment directory to create', defaultDescription: 'experiment name' },
      type: { type: 'string', describe: 'The type of experiment' },
      forceReInit: {
        type: 'boolean',
        alias: 'f',
        describe: 'If existing experiments must be overwritten',
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => {
    const target = argv.target || argv.name;
    const output = await wrapVisualProgress('Initializing new experiment',
      async() => new TaskInitialize(context, argv.type, argv.name, target, argv.forceReInit, !await fs.pathExists(`${__dirname}/../../../test`)).init());

    process.stderr.write(`Initialized new experiment in ${output.experimentDirectory}\n`);
    if (output.hookNames.length > 0) {
      process.stderr.write(`\n${withColor('WARNING:', COLOR_YELLOW)} This experiment requires the following hooks before it can be used:\n`);
      for (const hookName of output.hookNames) {
        process.stderr.write(`  - ${hookName}\n`);
      }
      process.stderr.write(`Initialize these hooks by calling 'jbr ${commandSetHook}'\n`);
    }
  });