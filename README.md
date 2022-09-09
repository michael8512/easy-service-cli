# easy-service
cli of mock and generate service

## Install

> npm i easy-service-cli -g

## Usage

#### install dependency & initialize .env config

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

#### download api swagger based on API_URL from .env

> easy-service download

#### generate service by API swagger

> easy-service generate-service [workDir]

#### start mock server based on MORK_PORT form .env

> easy-service mock
