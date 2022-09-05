import path from 'path'
import { execSync } from 'child_process';
import fs from "fs";
import fetch from 'node-fetch';
import { forEach } from 'lodash'
import { logError, logSuccess, logInfo } from './util/log';
import { ConfigProps } from './mock-server'


const startDowLoad = async (urlList: Array<{url: string}>) => {
  const pList:Array<Promise<void>> = [];
  forEach(urlList, ({url})=> {
    let p:Promise<void> = new Promise((resolve)=> {
      fetch(url, {
        headers: {  }
      }).then((res) => {
        return res.json();
      }).then(data => {
        const title = data?.info?.title || Math.random().toFixed(0)
        const _path = path.resolve(process.cwd(), `./config/swagger/${title}.json`);
        logInfo(`download swagger:【${title}.json】`);
        fs.writeFileSync(_path, JSON.stringify(data), 'utf8');
        resolve();
      });
    });
    pList.push(p);
  });

  await Promise.all(pList);
  logSuccess('swagger files are update to date, bye 👋');
}

const clearSwaggerFiles = () => {
  execSync(`rm -rf ${path.join(process.cwd(), './config/swagger')}`);
  fs.mkdirSync(path.join(process.cwd(), './config/swagger'));
}

const updateSwaggerFiles = async ()=> {
  const configPath = path.join(process.cwd(), './config/config.json');

  if (!fs.existsSync(configPath)) {
    logError('please execute "npm run setup" first!')
    process.exit(1);
  }

  const { linkFiles }: ConfigProps = await require(configPath);

  console.log(linkFiles)

  clearSwaggerFiles();
  startDowLoad(linkFiles);
}

updateSwaggerFiles();
