import fs from 'fs';
import path from 'path';

const configPath = path.resolve(__dirname, '..', 'config.json');
const raw = fs.readFileSync(configPath, 'utf-8');
const config = JSON.parse(raw);

export const OS_HOSTNAME = config.hostname as string;
export const OS_USERNAME = config.username as string;
export const OS_PASSWORD = config.password as string;