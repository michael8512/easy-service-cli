import path from 'path'
import { execSync } from 'child_process';
import fs from "fs";
import fetch from 'node-fetch';
import { logError, logSuccess, logInfo } from './util/log';
import { ConfigProps } from './mock-server'
import dotenv from 'dotenv';

const startDowLoad = async (config: ConfigProps) => {
  new Promise<void>((resolve)=> {
    fetch(config.API_URL, {
      headers: {}
    }).then((res) => {
      return res.json();
    }).then(data => {
      const title = data?.info?.title || 'swagger';
      const _path = path.resolve(config.ROOT_PATH, `./easy-service-config/swagger/${title}.json`);
      logInfo(`download swagger:【${title}.json】`);
      fs.writeFileSync(_path, JSON.stringify(data), 'utf8');
      resolve();
    });
  });

  logSuccess('swagger files are update to date, bye 👋');
}

const clearSwaggerFiles = (rootPath: string) => {
  execSync(`rm -rf ${path.join(rootPath, './easy-service-config/swagger')}`);
  fs.mkdirSync(path.join(rootPath, './easy-service-config/swagger'));
}
const updateSwaggerFiles = async ()=> {
  if (!fs.existsSync(path.resolve(process.cwd(), `./package.json`))) {
    logError('please execute in your root path!')
    process.exit(1);
  }
  
  const configPath = path.resolve(process.cwd(), `./easy-service-config/.env`);

  if (!fs.existsSync(configPath)) {
    logError('please setup first by executing "easy-service init"!')
    process.exit(1);
  }

  const config: ConfigProps = dotenv.config({ path: configPath }).parsed as any;

  clearSwaggerFiles(config.ROOT_PATH);
  startDowLoad(config);
}

export default updateSwaggerFiles;
