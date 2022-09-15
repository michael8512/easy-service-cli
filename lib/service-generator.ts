import path from 'path';
import fs from 'fs';
import { logSuccess, logInfo, logError } from './util/log';
import { walker } from './util/file-walker';
import { JSONSchema7, JSONSchema7TypeName } from 'json-schema';
import { formatApiPath, formatJson, getSteadyContent, NUMBER_TYPES } from './util/helper';
import get from 'lodash/get';
import forEach from 'lodash/forEach';

type ParamsType = 'query' | 'body' | 'path' | 'header';

interface JSONSchema extends Omit<JSONSchema7, 'type'> {
  type: JSONSchema7TypeName | 'integer' | 'float' | 'double' | 'long';
}

interface ApiItem {
  apiName: string;
  method: string;
  resType: string;
  parameters: string;
  resData: string;
}

interface SwaggerData {
  paths: {
    [p: string]: {
      [m: string]: object;
    };
  };
  definitions: {
    [p: string]: JSONSchema;
  };
}

const getResData: any = (swaggerData: SwaggerData) => {
  const componentMap: { [p: string]: any } = {}
  
  const getBaseData: any = (props: JSONSchema & { propertyName?: string }) => {
    const { type, properties = {}, items, required = [] } = props || {};
    let value;
  
    if (type === 'object') {
      const data: { [p: string]: string | object } = {};
      // eslint-disable-next-line guard-for-in
      if (Object.keys(properties).length === 0) {
        value = 'object'
      } else {
        for (const key in properties) {
          const pData = properties[key] as JSONSchema;
          const __key = required.includes(key) ? key : `${key}?`;
          data[__key] = getBaseData({ ...pData, propertyName: key });
        }
        value = data;
      }
    } else if (type === 'array' && items) {
      const itemsType = getResponseType(items, swaggerData);
  
      if (itemsType === 'array' || itemsType === 'object') {
        const componentName = get(items, '$ref')?.split('/').slice(-1)[0];
        const componentContent = getSchemaData(items as any)[0];
        value = componentName ? `${componentName}[]` : `Array<${formatJson(componentContent)}>`;

        if (value === 'Array<object>') {
          value = 'object[]'
        }
      } else {
        value = `${itemsType}[]`;
      }
    } else if (NUMBER_TYPES.includes(type)) {
      value = 'number';
    } else {
      value = type;
    }
    return value;
  };

  const getSchemaData: any = (schemaData: JSONSchema)=> {
    const { $ref, type } = schemaData || {};
    let res;
    if ($ref) {
      const componentName = $ref.split('/').slice(-1)[0]
      res = componentName;
      if (!componentMap[componentName]) {
        componentMap[componentName] = getSchemaData(get(swaggerData, $ref.split('/').slice(1)))[0];
      }
    } else if (type) {
      res = getBaseData(schemaData);
    } else {
      res = schemaData;
    }

    return [res || {}, componentMap];
  }

  return getSchemaData;
};

const getResponseType: any = (schemaData: JSONSchema, swaggerData: SwaggerData) => {
  const { $ref = '', type } = schemaData || {};
  return type
    ? type
    : $ref
      ? getResponseType(get(swaggerData, $ref.split('/').slice(1)) || {}, swaggerData)
      : null
};

const autoGenerateService = (
  content: string,
  filePath: string,
  isEnd: boolean,
  swaggerData: SwaggerData,
  config: { 
    REG_SERVICE: RegExp; 
    REG_SYMBOL: RegExp;
    getApiInfoByReg: (res: any) => { apiName: string, method: string, apiPath: string };
    getOutputServiceByTemplate: (res: { apiName: string, paramsT: string, resT: string }) => string;
  },
  resolve: (value: void | PromiseLike<void>) => void,
) => {
  if (content.match(config.REG_SYMBOL)) {

    const apiList: ApiItem[] = [];

    let serviceContent = getSteadyContent(filePath, content);
    const typeFilePath = filePath.replace(/\/services\//, '/types/').replace(/\.ts/, '.d.ts');
    let typeContent = getSteadyContent(
      typeFilePath,
      fs.existsSync(typeFilePath) ? fs.readFileSync(typeFilePath, 'utf8') : '',
    );

    let regRes = config.REG_SERVICE.exec(content);

    while (regRes) {
      const { apiName, method, apiPath: _apiPath } = config.getApiInfoByReg(regRes);

      const { url: apiPath, pathParams } = formatApiPath(_apiPath);
      // get params from api path
      let parameters: { [p: string]: string } = { ...pathParams };

      // get params from 'parameters'
      forEach(
        get(swaggerData, ['paths', apiPath, method, 'parameters']),
        ({
          name,
          type,
          in: paramsIn,
          schema,
          required,
        }: {
          name: string;
          type: string;
          in: ParamsType;
          schema: JSONSchema;
          required?: boolean;
        }) => {
          type = type ?? getResponseType(schema);
          if (paramsIn === 'query') {
            parameters[`${name}${required ? '' : '?'}`] = NUMBER_TYPES.includes(type) ? 'number' : type;
          } else if (paramsIn === 'path') {
            parameters[name] = NUMBER_TYPES.includes(type) ? 'number' : type;
          } else if (paramsIn !== 'header') {
            const getDataBySchema = getResData(swaggerData)
            const tempType = getDataBySchema(schema);

            if (typeof tempType === 'string') {
              parameters[name] = tempType;
            } else {
              parameters = {
                ...parameters,
                ...(tempType || {}),
              };
            }
          }
        },
      );

      const _schemaData = get(swaggerData, ['paths', apiPath, method, 'responses', '200', 'content', 'application/json', 'schema']);

      const resType = getResponseType(_schemaData, swaggerData);

      const getDataBySchema = getResData(swaggerData)
      const [fullData, dMap] = getDataBySchema(_schemaData) || {};

      const responseData = fullData.data || fullData['data?'] || dMap[fullData] || fullData;

      const _resData: string = responseData ? JSON.stringify(responseData, null, 2) : 'void';
      let resData = responseData ? formatJson(_resData) : 'void';

      for (let key in dMap) {
        if (key !== fullData) {
          resData += `\r\n
interface ${key} ${formatJson(dMap[key])}`
        }
      }

      // if (_resData.startsWith('"Array<')) {
      //   resData = formatJson(_resData.slice(7, _resData.length - 2));
      // }

      apiList.push({
        apiName,
        method,
        parameters: formatJson(parameters),
        resData,
        resType,
      });

      // continue to execute
      regRes = config.REG_SERVICE.exec(content);
    }

    forEach(apiList, ({ apiName, parameters, resData, resType }) => {
      let pType = '{}';
      let bType = 'void';

      if (['string', 'number', 'boolean'].includes(resData)) {
        bType = resData;
      } else if (resData !== '{}') {
        if (resType === 'pagingList') {
          bType = `IPagingResp<T_${apiName}_item>`;
        } else if (resType === 'array') {
          bType = `T_${apiName}_item[]`;
        } else {
          bType = `T_${apiName}_data`;
        }

        if (resData !== 'void') {
          typeContent += `
interface T_${apiName}_data ${resData}\n`;
        } else {
          typeContent += `
type T_${apiName}_data = ${resData}\n`;          
        }
      }
      if (parameters !== '{}') {
        typeContent += `
interface T_${apiName}_params ${parameters}\n`;
        pType = `T_${apiName}_params`;
      }

      serviceContent += `
${config.getOutputServiceByTemplate({apiName, paramsT: pType, resT: bType})}
        `;
    });

    fs.writeFileSync(typeFilePath, typeContent, 'utf8');
    fs.writeFileSync(filePath, serviceContent, 'utf8');
  }
  if (isEnd) {
    logSuccess('service data is updated, bye 👋');
    resolve();
  }
};

const getSwagger = async (filePath: string)=> {
  try {
    let paths = {};
    let components = {} as any;

    await new Promise<void>((resolve) => {
      walker({
        root: filePath,
        dealFile: async (_content: string, filePath: string, isEnd: boolean, isEmpty?: boolean) => {
          if (isEmpty) {
            resolve();
            return;
          }

          const data = await require(filePath);

          paths = {...paths, ...data.paths }
          components = {...components, ...data.components }

          if (isEnd) {
            logSuccess('get swagger data successfully, bye 👋');
            resolve();
          }
        },
      });
    });
    
    return { paths, components };
  } catch (error) {
    logError(error);
    return error;
  }
}

const autoGenerate= async (workDir: string) => {
  try {
    const configPath = path.resolve(workDir, `./easy-service-config/config.ts`);

    if (!fs.existsSync(configPath)) {
      logError('please make sure the env file exist in the execute path!')
      process.exit(1);
    }

    const { config } = await require(configPath)
    
    logInfo(`local swagger config: ${JSON.stringify(config)}`);
    
    const swagger = await getSwagger(workDir+'/easy-service-config/swagger');

    if (Object.keys(swagger?.paths)?.length) {
      // search all files with suffix of '.ts' in target services directory, and handle the target file
      await new Promise<void>((resolve) => {
        walker({
          root: config.SERVICES_PATH,
          dealFile: (...args) => {
            autoGenerateService.apply(null, [...args, swagger, config, resolve]);
          },
        });
      });
    } else {
      logError('It is an empty swagger!');
      process.exit(1);
    }
  } catch (error) {
    logError(error);
  }
};

export default autoGenerate;
