const env = `
MOCK_PORT=7001
SERVICE_REG=/([a-zA-Z]+):\\s*{\\n\\s*api:\\s*'(get|post|put|delete)@(\\/api(\\/:?[a-zA-Z-]+)+)',(\\s\\/\\/\\sAUTO)/g
REG_API=/([a-zA-Z]+):\s*{\\n\\s*api:\\s*'(get|post|put|delete)@(\\/api(\\/:?[a-zA-Z-]+)+)',(\\s\\/\\/\\sAUTO)/g
ROOT_PATH=[application path]
SERVICES_PATH=[service file path of your application]
API_URL=[url path of your api file]
`;

export default env;