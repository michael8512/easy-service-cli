import fs from 'fs';
import { EOL } from 'os';

export const getSteadyContent = (filePath: string, content?: string) => {
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

export const formatJson = (data: string | object) => {
  const jsonData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return jsonData.replace(/\\+n/g, '\n').replace(/"/g, '');
};

export const NUMBER_TYPES = ['integer', 'float', 'double', 'number', 'long'];


export const formatApiPath = (apiPath: string) => {
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