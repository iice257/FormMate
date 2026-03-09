const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'src');
let issues = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file.startsWith('.')) continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(__dirname, filePath);

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // a tags without href
    if (line.match(/<a[\s>]/) && !line.includes('href=')) {
      issues.push(`[a tag missing href] ${relPath}:${lineNum}`);
    }

    // Hardcoded HTTP images
    if (line.match(/<img.*src=/) && line.includes('http://')) {
      issues.push(`[Insecure HTTP image] ${relPath}:${lineNum}`);
    }

    // Clickable divs/spans without ARIA/tabindex
    if ((line.match(/<div/) || line.match(/<span/)) && (line.includes('cursor-pointer') || line.includes('onclick'))) {
      if (!line.includes('role=') && !line.includes('tabindex=')) {
        issues.push(`[Clickable div/span without ARIA/tabindex] ${relPath}:${lineNum}`);
      }
    }

    // Missing label for inputs
    if (line.match(/<input/) && !line.includes('id=') && !line.includes('aria-label=') && !line.includes('type="hidden"')) {
      issues.push(`[Input missing id/aria-label for a11y] ${relPath}:${lineNum}`);
    }

    // Missing lang in html
    if (line.match(/<html/) && !line.includes('lang=')) {
      issues.push(`[HTML tag missing lang] ${relPath}:${lineNum}`);
    }

    // General bare try catch without specific logging
    if (line.match(/catch\s*\(\w*\)\s*{\s*}/)) {
      issues.push(`[Empty catch block swallowed error] ${relPath}:${lineNum}`);
    }
  });
}

scanDir(rootDir);
// Also scan root index.html
if (fs.existsSync(path.join(__dirname, 'index.html'))) {
  scanFile(path.join(__dirname, 'index.html'));
}

console.log('Found additional issues:', issues.length);
console.log(issues.join('\n'));
