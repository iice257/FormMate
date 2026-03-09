const fs = require('fs');
const d = 'c:/Users/Hp/Documents/GitHub/FormMate/FormMate/src/screens';
const files = fs.readdirSync(d).filter(f => f.endsWith('.js'));
let replacedCount = 0;
files.forEach(f => {
  const p = d + '/' + f;
  let c = fs.readFileSync(p, 'utf8');
  const regex = /<div class="size-(\d+)[^"]*bg-white[^"]*">\s*<img src="\/logo\.png"/g;
  const regex2 = /<div class="size-[^"]*rounded-[^"]*bg-white[^"]*">\s*<img src="\/logo\.png"/g;
  const regex3 = /<div class="[^"]*size-(\d+)[^"]*bg-white[^"]*">\s*<img src="\/logo\.png"/g;

  if (regex.test(c) || regex2.test(c) || regex3.test(c) || /bg-gradient/.test(c)) {
    // simpler replacement: just replace the parent div if it contains bg-white
    c = c.replace(/<div class="[^"]*bg-white[^"]*size-(\d+)[^"]*">\s*<img src="\/logo\.png"/g, '<div class="size-$1 flex shrink-0 items-center justify-center">\n              <img src="/logo.png"');
    c = c.replace(/<div class="size-(\d+)[^"]*bg-white[^"]*">\s*<img src="\/logo\.png"/g, '<div class="size-$1 flex shrink-0 items-center justify-center">\n              <img src="/logo.png"');

    // Auth mobile logo
    c = c.replace(/<div class="lg:hidden flex items-center gap-3 mb-10">\s*<div class="size-10 rounded-xl bg-white shadow-sm border border-slate-100 p-\[3px\] flex items-center justify-center">\s*<img src="\/logo\.png"([^>]+)>/, '<div class="lg:hidden flex items-center gap-3 mb-10">\n            <div class="size-10 flex shrink-0 items-center justify-center">\n              <img src="/logo.png"$1>');

    // Success screen
    c = c.replace(/<div class="size-12 rounded-xl bg-white shadow-sm border border-slate-100 p-1 flex items-center justify-center">\s*<img src="\/logo\.png"/, '<div class="size-12 flex shrink-0 items-center justify-center">\n              <img src="/logo.png"');

    // Auth desktop
    c = c.replace(/<div class="size-10 rounded-xl bg-white\/20 backdrop-blur-sm p-\[3px\] flex items-center justify-center border border-white\/30">\s*<img src="\/logo\.png"/, '<div class="size-10 flex shrink-0 items-center justify-center">\n              <img src="/logo.png"');

    c = c.replace(/<div class="size-(\d+)[^>]*>\s*<img src="\/logo\.png"/g, '<div class="size-$1 flex shrink-0 items-center justify-center">\n            <img src="/logo.png"');
    fs.writeFileSync(p, c);
    replacedCount++;
  }
});
console.log('Fixed wrappers in ' + replacedCount + ' files.');
