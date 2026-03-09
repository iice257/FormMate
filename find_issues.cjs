const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'src');

let issuesMap = {
  security: [],
  accessibility: [],
  performance: [],
  bestPractices: []
};

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file.startsWith('.')) continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
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

    // Security
    if (line.includes('innerHTML =')) {
      issuesMap.security.push(`[innerHTML usage] ${relPath}:${lineNum}`);
    }
    if (line.includes('target="_blank"') && !line.includes('rel="noopener')) {
      issuesMap.security.push(`[Missing rel=noopener] ${relPath}:${lineNum}`);
    }

    // Accessibility
    if (line.match(/<img[^>]+>/) && !line.match(/alt=['"]/)) {
      issuesMap.accessibility.push(`[img missing alt tag] ${relPath}:${lineNum}`);
    }

    // Performance
    if (line.match(/forEach/) && line.match(/getElementById/)) {
      issuesMap.performance.push(`[DOM query in loop] ${relPath}:${lineNum}`);
    }

    // Best Practices
    if (line.match(/console\.(log|warn|error|info)/)) {
      issuesMap.bestPractices.push(`[console.xxx left in code] ${relPath}:${lineNum}`);
    }
    if (line.includes('TODO:') || line.includes('FIXME:')) {
      issuesMap.bestPractices.push(`[TODO/FIXME left] ${relPath}:${lineNum}`);
    }
    if (line.match(/setTimeout\([^,]+,\s*(800|1000|[0-9]{4})\)/)) {
      issuesMap.bestPractices.push(`[Hardcoded large timeout/delay] ${relPath}:${lineNum}`);
    }

    // CSS/UI
    if (filePath.endsWith('.css') && line.match(/#[0-9a-fA-F]{3,6}/)) {
      issuesMap.bestPractices.push(`[Hardcoded hex color instead of var] ${relPath}:${lineNum}`);
    }
  });
}

scanDir(rootDir);
// Also scan root index.html
scanFile(path.join(__dirname, 'index.html'));

let total = 0;
for (const key in issuesMap) {
  total += issuesMap[key].length;
}

console.log('--- SCAN RESULTS ---');
console.log('Total Automated Issues Found:', total);
console.log('Security:', issuesMap.security.length);
console.log('Accessibility:', issuesMap.accessibility.length);
console.log('Performance:', issuesMap.performance.length);
console.log('Best Practices:', issuesMap.bestPractices.length);

console.log('\n--- DETAILED SECURITY ---');
console.log(issuesMap.security.join('\n'));

console.log('\n--- DETAILED ACCESSIBILITY ---');
console.log(issuesMap.accessibility.join('\n'));

console.log('\n--- DETAILED BEST PRACTICES ---');
console.log(issuesMap.bestPractices.join('\n'));
