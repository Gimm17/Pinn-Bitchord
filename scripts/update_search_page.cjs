const fs = require('fs');
let c = fs.readFileSync('web/app/src/pages/SearchPage.tsx', 'utf8');
const target = "const topCard = 'group/top relative rounded-[8px] bg-quinary hover:bg-quaternary';";
const repl = "const topCard = 'group/top relative rounded-xl border border-[#DED8CB] bg-white shadow-sm hover:border-[#C8DFDB] hover:shadow-md transition-all';";
if (c.includes(target)) {
  fs.writeFileSync('web/app/src/pages/SearchPage.tsx', c.replace(target, repl), 'utf8');
  console.log('Updated SearchPage.tsx successfully');
} else {
  console.log('Target not found in SearchPage.tsx');
}
