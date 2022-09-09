import Mock from 'mockjs';
import get from 'lodash/get';
import forEach from 'lodash/forEach';
import every from 'lodash/every';
import * as tsj from 'ts-json-schema-generator';
import { resolve } from 'path';
import { JSONSchema7, JSONSchema7TypeName, JSONSchema7Type } from 'json-schema'

interface GetBasicTypeDataProps extends JSONSchema7 {
  propertyName?: string;
  fullData?: JSONSchema7
}
interface JSONSchema extends Omit<JSONSchema7, 'type'> {
  type: JSONSchema7TypeName | 'integer' | 'float' | 'double' | 'long';
}

const MAX_REPEAT = 5


export interface SwaggerData {
  paths: {
    [p: string]: {
      [m: string]: object;
    };
  };
  definitions: {
    [p: string]: JSONSchema;
  };
}

const { Random } = Mock;
const TIME_NAMES = ['updatedAt', 'date', 'time', 'createAt', 'createdAt'];


const getCustomSimpleTypeData = ({type, propertyName, enums}: {
  type: string, 
  propertyName?: string,
  enums?: JSONSchema7Type[]
}) => {
  let value;
  switch (type) {
    case 'string':
      if (propertyName && TIME_NAMES.includes(propertyName)) {
        value = Random.datetime();
      } else {
        value = !enums ? Random.name() : Mock.mock({ 'list|1': enums }).list;
      }
      break;
    case 'number':
      value = Random.integer(0, 100);
      break;
    case 'integer':
      value = Random.integer(0, 100);
      break;
    case 'boolean':
      value = Random.boolean();
      break;
    case 'string[]':
      value = Mock.mock({
        'list|1-10': [() => Random.name()],
      });
      break;
    case 'number[]':
      value = Mock.mock({
        'list|1-10': [() => Random.integer(0, 100)],
      });
      break;
    case 'boolean[]':
      value = Mock.mock({
        'list|1-10': [() => Random.boolean()],
      });
      break;
    default:
      value = null;
  }
  return value;
}

const getCustomDataTypeData = (data: string)=> {
  if (!data.startsWith('{')) {
    return getCustomSimpleTypeData({type: data});
  } else {
    const tempData = data.replace(/{|}|\s/g, '').split(';')
    const res = {} as any;
    forEach(tempData, item=> {
      const [propertyName, propertyType] = item.split(':');
      const value  = getCustomSimpleTypeData({type: propertyType, propertyName});
      if (propertyName) {
        res[propertyName] = value;
      }
    })
    return res; 
  }
}


export default (props: {
  dataType: string;
  responseType?: 'object' | 'array' | 'pagingList';
  file?: string;
  tsconfig?: string;
  localData?: any;
  customDataType?: string;
  type?: string;
  schemaData?: {
    $ref?: string;
    allOf?: Array<{$ref: string}>
  };
  exactData?: any;
}, swagger?: SwaggerData) => {
  const { dataType = '', responseType = 'object', file, tsconfig, localData, type, customDataType, schemaData } = props;
  if (localData) {
    return localData;
  }

  const _mockFunc = () => {
    const componentsMap: {
      [p: string]: { count: number; data: any }
    } = {};

    const _getMockData: any = (schemaData: JSONSchema7, fullData: JSONSchema7) => {
      const _ref = schemaData?.$ref || get(schemaData, ["allOf", 0, '$refs'])
      
      if (_ref) {
        if (componentsMap[_ref] && componentsMap[_ref].count > MAX_REPEAT) {
          return componentsMap[_ref].data || null;
        } else {
          const quoteList = _ref.split('/').slice(1);
          componentsMap[_ref] = componentsMap[_ref]
            ? {count: componentsMap[_ref].count+1, data: componentsMap[_ref].data} 
            : {count: 1, data: null};
          const _data = _getMockData(get(fullData, quoteList), fullData);
          componentsMap[_ref].data = componentsMap[_ref].data || _data;

          return _data;
        }
      } else {
        return getBasicTypeData({...schemaData, fullData} );
      }
    };

    const _getBasicTypeData = (props: GetBasicTypeDataProps) => {
      const { propertyName, type, enum: enums, fullData, items, properties = {} } = props || {};
      let value;
      
      switch (type) {
        case 'string':
          value = getCustomSimpleTypeData({ type, propertyName, enums });
          break;
        case 'boolean':
          value = getCustomSimpleTypeData({ type });
          break;
        case 'number':
          value = getCustomSimpleTypeData({ type });
          break;
        case 'integer':
          value = getCustomSimpleTypeData({ type });
          break;
        case 'array':
          const { list } = Mock.mock({
            'list|1-10': [
              () => _getMockData(items, fullData),
            ],
          });
          value = every(list, item=>!item) ? null : list;
          break;
        case undefined:
          value = _getMockData(props, fullData);
          break;
        default:
          const data = {} as any;
          for (const key in properties) {
            const pData = properties[key] as JSONSchema7;
            data[key] = _getBasicTypeData({ ...pData, propertyName: key, fullData });
          }
          value = data;
          break;
      }
      return value;
    };

    return [_getMockData, _getBasicTypeData];
  }

  const [getMockData, getBasicTypeData] = _mockFunc();


  if (schemaData && swagger) {
    const _ref = schemaData?.$ref || get(schemaData, ["allOf", 0, '$ref']);
    const refPaths = _ref?.split('/').slice(1);

    const dataTypeComp = get(swagger, refPaths);

    if (dataTypeComp) {
      return Mock.mock(getMockData(dataTypeComp, swagger)); 
    } else {
      return Mock.mock({
        success: true,
        data: null,
      }); 
    }
  }
  
  // to deal with custom response type like { id: number; name: string }
  if (customDataType) {
    return Mock.mock({
      success: true,
      data: getCustomDataTypeData(customDataType),
    });
  }

  // to deal with RAW_RESPONSE<T> and void
  if (['RAW_RESPONSE', 'void'].includes(dataType)) {
    return {
      success: true
    }
  } else if (dataType.startsWith('RAW_RESPONSE<')) {
    const tType = dataType.replace(/RAW_RESPONSE<|>/g, '');
    return Mock.mock({
      success: true,
      data: getCustomDataTypeData(tType),
    });
  }

  if (!file) return null;
  
  const config = {
    path: resolve(process.cwd(), file),
    tsconfig: tsconfig || resolve(process.cwd(), './tsconfig.json'),
    type: type || '*'
  };

  const mockData = tsj.createGenerator(config).createSchema(config.type);

  if (responseType === 'array') {
    return Mock.mock({
      success: true,
      'data|1-20': [
        () => {
          const data = mockData ? getMockData(get(mockData, ['definitions', dataType]), mockData) : {};
          return data;
        },
      ],
    });
  } else if (responseType === 'pagingList') {
    return Mock.mock({
      success: true,
      data: {
        'list|1-20': [
          () => {
            const data = mockData ? getMockData(get(mockData, ['definitions', dataType]), mockData) : {};
            return data;
          },
        ],
        total: Random.integer(0, 30),
      },
    });
  } else {
    const data = mockData ? getMockData(get(mockData, ['definitions', dataType]), mockData) : {};
    return Mock.mock({
      success: true,
      data,
    });
  }
};
