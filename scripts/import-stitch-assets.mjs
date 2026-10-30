import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const html=readFileSync(join(process.argv[2],'code.html'),'utf8');
const tags=html.match(/<[^>]+(?:src="https:\/\/lh3|background-image: url\('https:\/\/lh3)[^>]*>/g)||[];
const names=['logo','hero','region-1','region-2','region-3','region-4','region-5','region-6','smoked-meat','tea','coffee','pastry','spring-rolls','honey','cashews','fish-sauce','farmer','avatar-1','avatar-2','avatar-3','story-1','story-2','story-3'];
mkdirSync('public/images/stitch',{recursive:true});
const manifest=[];
for(let i=0;i<tags.length;i++){
  const url=tags[i].match(/https:\/\/lh3[^"')]+/)?.[0];if(!url)continue;
  const filename=names[i]+'.jpg',target=join('public/images/stitch',filename);
  if(!existsSync(target)){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`Asset ${i}: HTTP ${response.status}`);writeFileSync(target,Buffer.from(await response.arrayBuffer()));}
  manifest.push({file:'/images/stitch/'+filename,source:url,description:tags[i].match(/(?:data-alt|alt)="([^"]*)"/)?.[1]});
  console.log('Saved',filename);
}
writeFileSync('public/images/stitch/sources.json',JSON.stringify(manifest,null,2));
