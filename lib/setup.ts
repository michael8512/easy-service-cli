import { join } from 'path'
import fs from "fs";
import { logError, logSuccess } from './util/log';
import path from 'path';

const CONFIG_CONTENT = 
`
MOCK_PORT=7001
SERVICE_REG=/([a-zA-Z]+):\\s*{\\n\\s*api:\\s*'(get|post|put|delete)@(\\/api(\\/:?[a-zA-Z-]+)+)',(\\s\\/\\/\\sAUTO)/g
REG_API=/([a-zA-Z]+):\s*{\\n\\s*api:\\s*'(get|post|put|delete)@(\\/api(\\/:?[a-zA-Z-]+)+)',(\\s\\/\\/\\sAUTO)/g
ROOT_PATH=[application path]
SERVICES_PATH=[service file path of your application]
API_URL=[url path of your api file]
`;

const LOCAL_ROUTER_CONTENT = 
`/*
  url rule:
    1) /api/demo/notify-histories, method='get' --> /get/demo/notify-histories
    2) /api/demo/notify-histories/:id, method='put'  --> /put/demo/notify-histories/:id

  properties:
    1) name: unique name of this url data
    2) localData: any

  >> example:
    '/get/demo/notify-histories': {
      name: 'getDataSourceList',
      localData: { 
        success: true,
        data: {
          id: 1, 
          name: 'mock' 
        }
      }
    },
*/


export default {

}`;

const setup = ()=> {
  const rootPath = process.cwd()

  if (!fs.existsSync(path.resolve(rootPath, `./package.json`))) {
    logError('please execute in the root path!')
    process.exit(1);
  }

  const configPath = path.resolve(rootPath, `./easy-service-config`);

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(join(configPath));
    fs.mkdirSync(join(configPath, './swagger'));
    fs.writeFileSync(join(configPath,'./.env'), CONFIG_CONTENT, 'utf8');
    fs.writeFileSync(join(configPath, './local-api-router.ts'), LOCAL_ROUTER_CONTENT, 'utf8');
  }

  logSuccess('static config files are generated successfully, bye 👋');

}

export default setup;