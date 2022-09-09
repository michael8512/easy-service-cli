const env = `
export const config = {
  MOCK_PORT: 7001,
  ROOT_PATH: "",
  SERVICES_PATH: "",
  API_URL: "",
  SERVICE_REG: "",
  REG_API: "",
  REG_SYMBOL: "",
  getApiInfoByReg: (regRes: any) => {
    const [, apiName, method, apiPath] = regRes;
    return { apiName, method, apiPath };
  },
  getOutputServiceByTemplate: ({apiName, paramsT, resT}: {apiName: string, paramsT: string, resT: string}) => {
    return apiName+': (params: '+paramsT+')=> '+resT+';'
  }
};
`;

export default env;