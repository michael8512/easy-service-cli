import chalk from 'chalk';

export const { log } = console;
export const logInfo = (...msg: unknown[]) => log(chalk.blueBright(msg));
export const logSuccess = (...msg: unknown[]) => log('✅', chalk.green(msg));
export const logWarn = (...msg: unknown[]) => log('❗️', chalk.yellowBright(msg));
export const logError = (...msg: unknown[]) => log('❌', chalk.redBright(msg));
