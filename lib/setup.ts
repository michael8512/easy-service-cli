import { join } from 'path'
import fs from "fs";
import { logError, logSuccess } from './util/log';
import path from 'path';
import configContent from '../templates/config-template';
import localApiRouterContent from '../templates/local-api-router-template';

const setup = ()=> {
  const rootPath = process.cwd()

  if (!fs.existsSync(path.resolve(rootPath, './package.json'))) {
    logError('please execute in the root path!')
    process.exit(1);
  }

  const configPath = path.resolve(rootPath, './easy-service-config');

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(join(configPath));
    fs.mkdirSync(join(configPath, './swagger'));
    fs.writeFileSync(join(configPath,'./config.ts'), configContent, 'utf8');
    fs.writeFileSync(join(configPath, './local-api-router.ts'), localApiRouterContent, 'utf8');
  }

  logSuccess('static config files are generated successfully, bye 👋');

}

export default setup;