import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const root='dist/client';
async function walk(path){const files=[];for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())files.push(...await walk(child));else files.push(child)}return files}
const files=(await walk(root)).filter(file=>!file.slice(root.length+1).split('/').some(part=>part.startsWith('.'))&&!file.endsWith('/_headers')&&!file.endsWith('/_redirects')&&!file.endsWith('.map')&&!/\/(service-worker\.js|offline-assets\.json)$/.test(file)).sort();
const hash=createHash('sha256');for(const file of files){hash.update(file);hash.update(await readFile(file))}const version=hash.digest('hex').slice(0,20);
await writeFile(join(root,'offline-assets.json'),JSON.stringify({version,assets:files.map(file=>'/'+file.slice(root.length+1))}));
const worker=await readFile('public/service-worker.js','utf8');await writeFile(join(root,'service-worker.js'),worker.replace("'BUILD'",JSON.stringify(version)));
console.log(`Aplicativo offline: ${files.length} arquivos públicos preparados (${version}).`);
