// Genera google-apps-script/Code.gs a partir de src/lib/appsScript.ts
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/lib/appsScript.ts', 'utf8');
const m = src.match(/String\.raw`([\s\S]*)`;\s*$/);
fs.writeFileSync(__dirname + '/../google-apps-script/Code.gs', m[1]);
