import jsonServer from 'json-server';
import getMockData from './mock';
import { keys, forEach }  from 'lodash';
import * as http from 'http';
import path from 'path';
import mockGenerator from './mock-generator';
import mockSwagger from './mock-swagger';
import { logInfo, logSuccess, logError } from './util/log';
import fs from 'fs';

export interface ConfigProps {
  MOCK_PORT: number;
  SERVICE_REG: RegExp;
  REG_API: RegExp;
  ROOT_PATH: string;
  SERVICES_PATH: string;
  API_URL: string
}

const server = jsonServer.create();

const data = {} as any;
const routes: { [p: string]: string } = {};

const initServer = async ({ serverPort }: { serverPort: number }) => {
  if (!fs.existsSync(path.resolve(process.cwd(), `./package.json`))) {
    logError('please execute in your root path!')
    process.exit(1);
  }
  
  const configPath = path.resolve(process.cwd(), `./easy-service-config/config.ts`);

  if (!fs.existsSync(configPath)) {
    logError('please setup first by executing "easy-service init"!')
    process.exit(1);
  }

  const { config } = await require(configPath);

  logInfo(`local swagger config: ${JSON.stringify(config, null, 2)}`);

  // data from auto generated
  const autoGeneratorRouter = config?.ROOT_PATH ? await mockGenerator(config.SERVICES_PATH) : {};

  // data from static swagger file
  const { swaggerRouter, swagger } = await mockSwagger(path.join(config.ROOT_PATH, './easy-service-config/swagger'));

  const localApiRouter = fs.readFileSync(path.join(config.ROOT_PATH, './easy-service-config/local-api-router.ts')) || {};

  const routerData = { ...swaggerRouter, ...autoGeneratorRouter, ...localApiRouter };

  forEach(keys(routerData), (url) => {
    const { name } = routerData[url];
    data[name] = {};
    routes[url] = `/${name}`;
  });
  
  const router = jsonServer.router(data);
  const middleWares = jsonServer.defaults({ noCors: false });
  const rewriter = jsonServer.rewriter(routes);
  server.use(middleWares);

  // convert the method to get
  server.use((request: http.IncomingMessage, _res: http.ServerResponse, next: () => void) => {
    request.method = 'GET';

    const { url } = request;
    // generate mock data when getting real request
    if (url) {
      logInfo(url, routes[url]);
      const name = routes[url]?.slice(1);
      if (name) {
        data[name] = getMockData(routerData[url], swagger);
      }
    }
    next();
  });
  
  server.use(rewriter); // rewrite before router config
  server.use(router);

  const port = serverPort || config.MOCK_PORT || 7001;
  
  server.listen(port, () => logSuccess(`open mock server at localhost:${port}`));
}

export default initServer;
