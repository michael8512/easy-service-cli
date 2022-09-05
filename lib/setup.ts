import { join } from 'path'
import fs from "fs";
import { logSuccess } from './util/log';

const CONFIG_CONTENT = 
`{
  "projectRootPath": "",
  "username": "",
  "password": ""
}`;

const LOCAL_ROUTER_CONTENT = 
`/*
  url rule:
    1) /api/fdp/notify-histories, method='get' --> /get/fdp/notify-histories
    2) /api/fdp/notify-histories/:id, method='put'  --> /put/fdp/notify-histories/:id

  properties:
    1) name: unique name of this url data
    2) localData: any

  >> example:
    '/get/fdp/notify-histories': {
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
  const configPath = join(process.cwd(), './config')
  fs.mkdirSync(join(configPath, './swagger'));
  fs.writeFileSync(join(configPath, './config.json'), CONFIG_CONTENT, 'utf8');
  fs.writeFileSync(join(configPath, './local-api-router.ts'), LOCAL_ROUTER_CONTENT, 'utf8');

  logSuccess('static config files are generated successfully, bye 👋');

}

setup();