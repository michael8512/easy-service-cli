#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import startMockServer from '../lib/mock-server';
import download from '../lib/swagger-download';
import generateService from '../lib/service-generator';
import setup from '../lib/setup';

const program = new Command();

inquirer.registerPrompt('directory', require('inquirer-select-directory'));

program.version(`easy-service-cli ${require('../package').version}`).usage('<command> [options]');

program
  .command('init')
  .description('setup')
  .action(async () => {
    setup();
  });

program
  .command('download')
  .description('download API swagger')
  .action(async () => {
    download();
  });

program
  .command('mock [port]')
  .description('generate mock data')
  .action(async (_port) => {
    startMockServer(_port);
  });

program
  .command('generate-service')
  .description('generate service by API swagger')
  .action(async () => {
    const workDir = process.cwd()
    generateService(workDir);
  });

program.parse(process.argv);
