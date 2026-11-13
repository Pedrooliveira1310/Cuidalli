import {rollup} from 'rollup';import {nodeResolve} from '@rollup/plugin-node-resolve';import json from '@rollup/plugin-json';
for(const [entry,out] of [['client.js','push-client.js'],['worker.js','firebase-messaging-sw.js']]){
 const bundle=await rollup({input:new URL(entry,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),plugins:[nodeResolve({browser:true}),json()]});
 await bundle.write({file:new URL('../backend/web/'+out,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),format:'iife'});await bundle.close();
}
