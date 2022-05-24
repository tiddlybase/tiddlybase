
const glob = require('glob');
const path = require('path');
const fs = require('fs');
// sourcemaps are relative to 'dist/'
const distDir = path.join(__dirname, '..', 'dist');
const sourcemaps = glob.sync('**/*.js.map', {cwd: distDir, ignore: ["functions/**", "sourcemaps/**"]});
sourcemaps.forEach(sourcemap => {
    const source = path.join(distDir, sourcemap);
    const destination = path.join(distDir, 'sourcemaps', sourcemap);
    console.log(`${source} -> ${destination}`);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.renameSync(source, destination);
});
