import path from 'path';
import fs from 'fs';
import { logSuccess, logInfo, logError } from './util/log';
import { walker } from './util/file-walker';
import { get, forEach, keys } from 'lodash';
import { JSONSchema7, JSONSchema7TypeName } from 'json-schema';
import { EOL } from 'os';
import dotenv from 'dotenv';

type ParamsType = 'query' | 'body' | 'path';

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

const NUMBER_TYPES = ['integer', 'float', 'double', 'number', 'long'];

const formatJson = (data: string | object) => {
  const jsonData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return jsonData.replace(/\\+n/g, '\n').replace(/"/g, '');
};

const formatApiPath = (apiPath: string) => {
  const pathParams: { [p: string]: string } = {};
  const newApiPath = apiPath.replace(/(:[a-zA-Z]+)/g, (p: string) => {
    const pName = p.slice(1);
    pathParams[pName] = pName.toLocaleLowerCase().includes('id') ? 'number' : 'string';
    return `<${pName}>`;
  });
  return {
    url: newApiPath,
    pathParams,
  };
};

const getSteadyContent = (filePath: string, content?: string) => {
  if (!fs.existsSync(filePath) || !content) {
    return `

// > AUTO GENERATED
`;
  } else if (!content.includes('GENERATED')) {
    return `${content}
// > AUTO GENERATED  
`;
  } else {
    const lastIndex = content.indexOf('GENERATED');
    const steadyContent = lastIndex ? content.slice(0, lastIndex + 9) : content;

    return `${steadyContent}${EOL}`;
  }
};

const getBasicTypeData = (props: JSONSchema & { propertyName?: string }, swaggerData: SwaggerData) => {
  const { type, properties = {}, items, required = [] } = props || {};
  let value;

  if (type === 'object') {
    const data: { [p: string]: string | object } = {};
    // eslint-disable-next-line guard-for-in
    for (const key in properties) {
      const pData = properties[key] as JSONSchema;
      const __key = required.includes(key) ? key : `${key}?`;
      data[__key] = getBasicTypeData({ ...pData, propertyName: key }, swaggerData);
    }
    value = data;
  } else if (type === 'array' && items) {
    const itemsType = get(items, 'type');
    if (itemsType === 'object' || itemsType === 'array') {
      value = `Array<${formatJson(getSchemaData(items, swaggerData))}>`;
    } else {
      value = `${itemsType}[]`;
    }
  } else if (type === 'integer' || type === 'number') {
    value = 'number';
  } else {
    value = type;
  }
  return value;
};

const getSchemaData: any = (schemaData: JSONSchema, swaggerData: SwaggerData) => {
  const { $ref, type } = schemaData || {};
  let res;
  if ($ref) {
    const quoteList = $ref.split('/').slice(1);
    res = getSchemaData(get(swaggerData, quoteList), swaggerData);
  } else if (type) {
    res = getBasicTypeData(schemaData, swaggerData);
  } else {
    res = schemaData;
  }
  return res || {};
};

const getResponseType = (schemaData: JSONSchema, swaggerData: SwaggerData) => {
  const { $ref } = schemaData || {};
  if ($ref) {
    const quoteList = $ref.split('/').slice(1);
    const _data = get(swaggerData, [...quoteList, 'properties', 'data']) || {};

    if (_data.type === 'object' && _data.properties?.total && _data.properties?.list) {
      return 'pagingList';
    } else {
      return _data.type;
    }
  } else {
    return schemaData?.type;
  }
};

const autoGenerateService = (
  content: string,
  filePath: string,
  isEnd: boolean,
  swaggerData: SwaggerData,
  config: { 
    REG_SEARCH: RegExp; 
    REG_API: RegExp;
  },
  resolve: (value: void | PromiseLike<void>) => void,
) => {
  if (content.match(config.REG_SEARCH)) {
    const apiList: ApiItem[] = [];

    let serviceContent = getSteadyContent(filePath, content);
    const typeFilePath = filePath.replace(/\/services\//, '/types/').replace(/-api\.ts/, '.d.ts');
    let typeContent = getSteadyContent(
      typeFilePath,
      fs.existsSync(typeFilePath) ? fs.readFileSync(typeFilePath, 'utf8') : '',
    );

    let regRes = config.REG_API.exec(content);

    while (regRes) {
      const [, apiName, method, _apiPath] = regRes;

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
          if (paramsIn === 'query') {
            parameters[`${name}${required ? '' : '?'}`] = NUMBER_TYPES.includes(type) ? 'number' : type;
          } else if (paramsIn === 'path') {
            parameters[name] = NUMBER_TYPES.includes(type) ? 'number' : type;
          } else {
            parameters = {
              ...parameters,
              ...(getSchemaData(schema) || {}),
            };
          }
        },
      );

      const _schemaData = get(swaggerData, ['paths', apiPath, method, 'responses', '200', 'schema']);

      const resType = getResponseType(_schemaData, swaggerData);
      const fullData = getSchemaData(_schemaData, swaggerData) || {};

      const responseData =
        resType === 'pagingList'
          ? fullData.data?.list || get(fullData, ['data?', 'list?'])
          : fullData.data || fullData['data?'] || {};

      const _resData: string = JSON.stringify(responseData, null, 2);
      let resData = formatJson(_resData);

      if (_resData.startsWith('"Array<')) {
        resData = formatJson(_resData.slice(7, _resData.length - 2));
      }

      apiList.push({
        apiName,
        method,
        parameters: formatJson(parameters),
        resData,
        resType,
      });
      regRes = config.REG_API.exec(content);
    }

    forEach(apiList, ({ apiName, parameters, resData, resType }) => {
      let pType = '{}';
      let bType = 'RAW_RESPONSE';
      if (resData !== '{}') {
        if (resType === 'pagingList') {
          bType = `IPagingResp<T_${apiName}_item>`;
        } else if (resType === 'array') {
          bType = `T_${apiName}_item[]`;
        } else {
          bType = `T_${apiName}_data`;
        }

        typeContent += `
interface T_${apiName}_${['array', 'pagingList'].includes(resType) ? 'item' : 'data'} ${resData}\n`;
      }
      if (parameters !== '{}') {
        typeContent += `
interface T_${apiName}_params ${parameters}\n`;
        pType = `T_${apiName}_params`;
      }

      serviceContent += `
export const ${apiName} = apiCreator<(p: ${pType}) => ${bType}>(apis.${apiName});
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


export default async ({ workDir }: { workDir: string }) => {
  try {

    const configPath = path.resolve(process.cwd(), `./easy-service-config/.env`);

    if (!fs.existsSync(configPath)) {
      logError('please make sure the env file exist in the execute path!')
      process.exit(1);
    }

    const { parsed: config } = dotenv.config({ path: configPath }) as any;

    logInfo(`local swagger config: ${config}`);

    const swagger = await require(config.ROOT_PATH+'/easy-service/swagger.json');

    if (keys(swagger?.paths)?.length) {
      // search all files with suffix of '-api.ts' in target work directory, and handle the target file
      await new Promise<void>((resolve) => {
        walker({
          root: workDir,
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
