const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /\{([a-zA-Z0-9_\.\?\s\|\[\]]+)\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const expr = match[1].trim();
    if (expr === 'personnel' || expr === 'selectedPersonnel' || expr === 'p' || expr === 'partner' || expr === 'pr' || expr === 'c' || expr === 'a' || expr === 'log') {
      console.log(`${file}: {${expr}}`);
    }
  }
});
