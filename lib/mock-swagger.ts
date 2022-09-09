import { logError, logSuccess } from './util/log';
import get from 'lodash/get';
import forEach from 'lodash/forEach';
import { walker } from './util/file-walker';

const JSON_CONTENT = ['responses', '200', 'content', 'application/json', 'schema'];
const ENCODED_CONTENT = ['responses', '200', 'content', 'application/x-www-form-urlencoded', 'schema'];
const ALL_CONTENT = ['responses', '200', 'content', '*/*', 'schema'];

export default async (workDir: string) => {
  try {
    let schemas = {};
    let apiMap = {} as any;

    await new Promise<void>((resolve) => {
      walker({
        root: workDir,
        dealFile: async (_content: string, filePath: string, isEnd: boolean, isEmpty?: boolean) => {
          if (isEmpty) {
            resolve();
            return;
          }

          const data = await require(filePath);

          const { paths } = data;
          forEach(Object.keys(paths), name => {
            const apiData = paths[name];
            const apiName = name.replace(/[<|{|\u003c]([a-zA-Z]+)[>|}|\u003e]/g, (p)=> {
              const pName = p.slice(1, p.length-1)
              return `:${pName}`;
            });
            forEach(Object.keys(apiData), method=> {
              const apiMethodData = apiData[method];
              const newApiPath = apiName.includes('api') ? apiName.replace(/\/api\//g, `/${method}/`) : `/${method}${apiName}`;
        
              apiMap[newApiPath] = {
                name: apiName.replace(/\/|:|-/g, ''),
                dataType: 'SWAGGER_DATA',
                schemaData: get(apiMethodData, JSON_CONTENT) || get(apiMethodData, ENCODED_CONTENT) || get(apiMethodData, ALL_CONTENT),
              }
            });
            schemas = { ...schemas, ...get(data, ['components', 'schemas'])};
          });

          if (isEnd) {
            logSuccess('get swagger data successfully, bye 👋');
            resolve();
          }
        },
      });
    });
    
    return { swaggerRouter: apiMap, swagger: { components: { schemas }}};
  } catch (error) {
    logError(error);
    return error;
  }
};
