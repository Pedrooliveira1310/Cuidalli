import {cp,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(root,process.argv[2]||'web-export');
const destination=path.join(root,'backend/web');
await cp(source,destination,{recursive:true});
let html=await readFile(path.join(destination,'index.html'),'utf8');
html=html.replace('<html lang="en">','<html lang="pt-BR">');
html=html.replace('</head>',`<meta name="theme-color" content="#39639A"/>
<meta name="description" content="Seus medicamentos, consultas e pessoas de confiança em um cuidado mais próximo."/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-brand.png?v=3"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-brand.png?v=3"/>
<link rel="manifest" href="/manifest.webmanifest?v=3"/>
</head>`);
html=html.replace('</body>','<script src="/push-client.js" defer></script><script src="/install.js" defer></script></body>');
await writeFile(path.join(destination,'index.html'),html);
console.log('Interface, favicon, instalação web e notificações preservados.');
