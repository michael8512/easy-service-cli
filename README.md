# easy-service
cli of mock and generate service

## Install

> npm i easy-service-cli -g

## Usage

#### install dependency & initialize config.ts

> easy-service init
```ts
export const config = {
  MOCK_PORT: 7001,
  ROOT_PATH: 【Root path of your application】, // like "/Users/username/projects"
  SERVICES_PATH: 【Your service path of your application】, // like "/Users/username/projects/app/services"
  API_URL: 【Api interface doc for file downloading】,
  REG_SERVICE: 【RegEx for matching your service code】// like 【/((get|post|put|delete)[a-zA-Z]+):\s*'(\/api(\/:?[a-z-]+)+)'/g】 to match 【getFilePagingList: '/api/workflow/categories/filetree/label/ancestors',】
  REG_API: 【RegEx for matching the service api which you wanna generate mock data】, // like 【/([a-zA-Z]+):\s*{\n\s*api:\s*'(get|post|put|delete)@(\/api(\/:?[a-zA-Z-]+)+)',(\s\/\/\sAUTO)/g】
  REG_SYMBOL: 【RegEx for matching the target file, the auto generated code will be insert into the target file below your symbol】// like 【/(\/\/\s>\sAUTO\s*GENERATED)/g】

  getApiInfoByReg: (regRes: any) => {
    const [, apiName, method, apiPath] = regRes;
    return { apiName, method, apiPath };
  },
  getOutputServiceByTemplate: ({apiName, paramsT, resT}: {apiName: string, paramsT: string, resT: string}) => {
    return apiName+': (params: '+paramsT+')=> '+resT+';'
  }
};
```

#### download api swagger based on API_URL from config.ts

> easy-service download

#### generate service by API swagger

> easy-service generate-service [workDir]

#### start mock server based on MORK_PORT form config.ts

> easy-service mock
```txt
will mock data by 3 ways
a) the api interface doc from easy-service-config/swagger/*
b) the matched service by REG_API
c) interface from local file of /easy-service-config/local-api.router.ts

the priority will be c > b > a
```

#### how to use the mock tool in your application?
> npm i axios-retry-adapter

> package.json [for example]
```json
"rm -rf public && NODE_ENV=development MODE=DEV MOCK=TRUE node --trace-deprecation node_modules/webpack/bin/webpack.js --config ./webpack/webpack.config.js --progress --color -w",
```

> webpack-config.js 
```ts

const getMockPort = () => {
  const { config } = dotenv.config({ path: path.resolve(process.cwd(), '../easy-service-config/config.ts') });
  return config.MOCK_PORT;
};
...

const mockPort = process.env.MOCK ? getMockPort() : '';

...
new webpack.DefinePlugin({
  ...
  'process.env.MOCK_PORT': JSON.stringify(mockPort),
}),
```

> axios config 
```ts
import axios, { AxiosAdapter } from 'axios';
  ...
  const mockPort = process.env.MOCK_PORT;

  axios.interceptors.request.use(
    (config) => {
      ... 

      const adapter = mockPort
      ? retryAdapterEnhancer(axios.defaults.adapter as AxiosAdapter, {
        retryTimes: 1,
        url: url.replace(/(\/api\/)/g, `/${method}/`),
        baseURL: `http://127.0.0.1:${mockPort}`,
      })
      : axios.defaults.adapter;

      set(config, 'adapter', adapter);
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  )

```