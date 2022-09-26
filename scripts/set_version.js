const path = require('path');
const fs = require('fs');
const newVersion = process.argv[2]
const workspaceDirs = process.argv[3]

const setVersion = (packageDir, newVersion) => {
    const filename = path.join(packageDir, 'package.json');
    pkg = JSON.parse(fs.readFileSync(filename, { encoding: 'utf-8' }));
    pkg.version = newVersion;
    fs.writeFileSync(filename, JSON.stringify(pkg, null, 4), { encoding: 'utf-8' });
}
    

for (line of workspaceDirs.split('\n')) {
    const dir = JSON.parse(line).location;
    if (dir !== '.') {
        setVersion(dir, newVersion);
    }
}
