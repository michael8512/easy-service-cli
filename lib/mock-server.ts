import jsonServer from 'json-server';
import getMockData from './mock';
import localApiRouter from '../config/local-api-router'; // data from local router file
import { keys, forEach }  from 'lodash';
import * as http from 'http';
import path from 'path';
import mockGenerator from './mock-generator';
import mockSwagger from './mock-swagger';
import { logInfo, logSuccess } from './util/log';
export interface ConfigProps {
  projectRootPath?: string;
  linkFiles: Array<{
    url: string;
  }>
}

const port = process.env.MOCK_PORT;
const server = jsonServer.create();

const data = {};
const routes = {};

const initServer = async () => {
  const workDir = process.cwd();
  const config: ConfigProps = await require(path.join(workDir, './config/config.json'));
  logInfo(`local swagger config: ${JSON.stringify(config, null, 2)}`);

  // data from auto generated
  const execPath = config?.projectRootPath ? path.resolve(process.cwd(), config.projectRootPath) : null;
  const autoGeneratorRouter = execPath ? await mockGenerator(execPath) : {};

  // data from static swagger file
  const { swaggerRouter, swagger } = await mockSwagger(path.join(workDir, './config/swagger'));

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
  
  server.listen(port, () => {
    logSuccess(`open mock server at localhost:${ port}`);
  });
}

initServer();
