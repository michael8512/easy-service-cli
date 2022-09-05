import { Command } from 'commander';
import inquirer from 'inquirer';
import { generate as mockGenerator } from '../lib/mock-generator';

const program = new Command();

inquirer.registerPrompt('directory', require('inquirer-select-directory'));

program.version(`api/easy-service ${require('../package').version}`).usage('<command> [options]');

program
  .command('mock-generator')
  .description('generate mock data')
  .action(async () => {
    mockGenerator();
  });

program.parse(process.argv);
