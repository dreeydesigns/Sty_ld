import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'tests'].includes(f)) {
        results = results.concat(walk(full));
      }
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('.');
const hashHrefMatches = [];
const deadHandlers = [];
const internalLinks = new Set();
const externalLinks = new Set();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    // Check href="#"
    if (line.includes('href="#"') || line.includes("href='#'") || line.includes('href={`#`}') || line.includes('javascript:void')) {
      hashHrefMatches.push({ file, line: i + 1, text: line.trim() });
    }
    // Check empty or console.log handlers
    if (/onClick=\{?\(\)?\s*=>\s*\{\s*\}?\}?/.test(line) || /onClick=\{?\(\)?\s*=>\s*console\.(log|warn)/.test(line)) {
      deadHandlers.push({ file, line: i + 1, text: line.trim() });
    }
    // Collect hrefs
    const hrefMatches = line.matchAll(/href=["']([^"']+)["']/g);
    for (const match of hrefMatches) {
      const url = match[1];
      if (url.startsWith('http://') || url.startsWith('https://')) {
        externalLinks.add(url);
      } else if (url.startsWith('/')) {
        internalLinks.add(url);
      }
    }
  });
});

console.log('==================================================');
console.log(`1. Dead Href matches (href="#"): ${hashHrefMatches.length}`);
console.log('==================================================');
hashHrefMatches.forEach(m => console.log(`  ${m.file}:${m.line} -> ${m.text}`));

console.log('\n==================================================');
console.log(`2. Empty/Console onClick matches: ${deadHandlers.length}`);
console.log('==================================================');
deadHandlers.forEach(m => console.log(`  ${m.file}:${m.line} -> ${m.text}`));

console.log('\n==================================================');
console.log(`3. Unique internal routes referenced (${internalLinks.size}):`);
console.log('==================================================');
console.log(Array.from(internalLinks).sort().join('\n'));

console.log('\n==================================================');
console.log(`4. Unique external URLs referenced (${externalLinks.size}):`);
console.log('==================================================');
console.log(Array.from(externalLinks).sort().join('\n'));
