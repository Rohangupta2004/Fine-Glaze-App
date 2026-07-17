const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

let modified = 0;

walk(appDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if Alert is used
    if (content.includes('Alert.alert')) {
      // Replace Alert.alert with showAlert
      content = content.replace(/Alert\.alert\(/g, 'showAlert(');
      
      // Determine relative path to src/utils/alert
      let relativePathToSrc = path.relative(path.dirname(filePath), path.join(__dirname, '..', 'src', 'utils', 'alert'));
      let importPath = relativePathToSrc.replace(/\\/g, '/'); // Use forward slashes
      if (!importPath.startsWith('.')) {
        importPath = './' + importPath;
      }
      
      // Add import statement at top (after last import or at beginning)
      const importStmt = `import { showAlert } from '${importPath}';\n`;
      
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
      } else {
        content = importStmt + content;
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      modified++;
      console.log(`Modified: ${filePath}`);
    }
  }
});

console.log(`Replaced Alert.alert in ${modified} files.`);
