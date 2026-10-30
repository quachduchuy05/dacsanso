import {readFile,mkdir,writeFile} from 'node:fs/promises';
const html=await readFile(process.argv[2],'utf8');
const images=[...html.matchAll(/<img\b[^>]*>/gs)].map(m=>({url:m[0].match(/src="([^"]+)"/)?.[1],description:m[0].match(/(?:data-alt|alt)="([^"]+)"/)?.[1]})).filter(x=>x.url?.startsWith('https://lh3.googleusercontent.com/'));
const backgrounds=[...html.matchAll(/url\(['"]?(https:\/\/lh3\.googleusercontent\.com\/[^'"\s)]+)['"]?\)/g)].map(m=>m[1]);
await mkdir('public/images/catalog',{recursive:true});
for(const [name,item] of [['banner',{url:backgrounds[0]??images[1]?.url}],['honey',images.find(x=>/honey/i.test(x.description??''))],['tea',images.find(x=>/tea/i.test(x.description??''))],['cardamom',images.find(x=>/cardamom/i.test(x.description??''))]]){
  if(!item?.url)continue;const response=await fetch(item.url);if(!response.ok)throw Error(`${name}: ${response.status}`);await writeFile(`public/images/catalog/${name}.jpg`,Buffer.from(await response.arrayBuffer()));console.log(`Saved ${name}`);
}
await writeFile('public/images/catalog/sources.json',JSON.stringify({images,backgrounds},null,2));
