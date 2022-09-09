/*
  url rule:
    1) /api/fdp/notify-histories, method='get' --> /get/fdp/notify-histories
    2) /api/fdp/notify-histories/:id, method='put'  --> /put/fdp/notify-histories/:id

  properties:
    1) name: unique name of this url data
    2) file: type file
    3) dataType: [namespace].[type]
    4) responseType: object(default) | array | pagingList
    5) customDataType: string | number | boolean, string[] | number[] | boolean[] | { [p:string]: [type] }

  >> example1:
    '/get/fdp/notify-histories': {
      name: 'getDataSourceList',
      file: './app/fdp/types/notify-manage.d.ts',
      dataType: 'NOTIFY_MANAGE.INotifyHistory',
      responseType: 'pagingList',
    },

  >> example2:
    "/get/fdp/queue/free-resource/:id": {
      "name": "getFreeResourceState",
      "file": "./app/fdp/types/queue-manage.d.ts",
      "dataType": "customDataType",
      "customDataType": "{ inUseCpu: number; freeCpu: number; cpuUsage: number; }"
    },
*/

import { logSuccess, logError, logInfo } from './util/log';
import { walker } from './util/file-walker';
import forEach from 'lodash/forEach';

const mockApiRes = {} as any;

const REG_SEARCH = /(apiCreator)/g;

/*
to regex the case of:
  getNotifyItems: '/api/fdp/notify-items', // > AUTO GENERATED

find the apiName, apiPath and method
*/
const REG_API = /(get|post|put|delete)([a-zA-Z-]+):\s+'\/api((\/:?[a-zA-Z-]+)+)'(.*?>\sAUTO\sGENERATED)/g;

/*
to regex the case of:
  getNotifyHistoryList: (params: IPagingRequest) => IPagingData<NOTIFY_MANAGE.INotifyHistory>;

find the apiName, apiPath and response dataType
*/
const REG_TYPE = /(get|post|put|delete)([a-zA-Z-]+):\s+\(.*?\s+=>\s+(.*?)}?;\s*\n/g;

const autoGenerateService = (
  content: string,
  filePath: string,
  isEnd: boolean,
  resolve: (value: void | PromiseLike<void>) => void,
) => {
  if (content.match(REG_SEARCH)) {
    let regRes = REG_API.exec(content);
    let typeRes = REG_TYPE.exec(content);

    const apiList = {} as {
      [p:string]: {
        [p:string]: string
      }
    };

    while (regRes) {
      const [, method, apiName, apiPath] = regRes;
      logInfo(`【apiName】${method + apiName}`, `【apiPath】${apiPath}`);
      regRes = REG_API.exec(content);

      const typeFilePath = filePath.replace(/\/services\//, '/types/').replace(/\.ts/, '.d.ts');

      apiList[method + apiName] = {
        name: method + apiName,
        file: typeFilePath,
        url: `/${method }${apiPath}`,
      };
    }

    while (typeRes) {
      const [, method, apiName, resDataType] = typeRes;
      const keyName = method + apiName;

      if (apiList[keyName]) {
        apiList[keyName].dataType = resDataType;
        if (resDataType.startsWith('{')) {
          apiList[keyName].customDataType = `${resDataType}}`;
          apiList[keyName].dataType = 'customDataType';
        } else if (resDataType.includes('IPagingData')) {
          apiList[keyName].responseType = 'pagingList';
          apiList[keyName].dataType = resDataType.replace(/IPagingData<|>/g, '');
        } else if (resDataType.includes('IPagingResponse')) {
          apiList[keyName].responseType = 'pagingList';
          apiList[keyName].dataType = resDataType.replace(/IPagingResponse<|>/g, '');
        } else if (resDataType.startsWith('Array<') || resDataType.endsWith('[]')) {
          apiList[keyName].responseType = 'array';
          apiList[keyName].dataType = resDataType.replace(/\[\]/, '');
        } else {
          apiList[keyName].dataType = resDataType;
        }
      }
      typeRes = REG_TYPE.exec(content);
    }

    forEach(Object.keys(apiList), (apiName: string) => {
      const { url } = apiList[apiName];
      mockApiRes[url] = { ...apiList[apiName], url: undefined };
    });
  }

  if (isEnd) {
    logSuccess('mock data is auto generated, bye 👋');
    resolve();
  }
};

export default async (workDir: string) => {
  try {
    await new Promise<void>((resolve) => {
      walker({
        root: workDir,
        dealFile: (content: string, filePath: string, isEnd: boolean) => {
          autoGenerateService.apply(null, [content, filePath, isEnd, resolve]);
        },
      });
    });
    return mockApiRes;
  } catch (error) {
    logError(error);
    return error;
  }
};
