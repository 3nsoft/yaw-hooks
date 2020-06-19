const path = require('path');
const fs = require('fs');
const folder = process.argv[2];
const file = path.join(`${folder ? folder : ''}`, 'package.json');
const packageInfo = JSON.parse(fs.readFileSync(file, { encoding: 'utf8' }));
console.log(packageInfo.version);