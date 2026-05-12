const fs = require('fs');
const files = [
  'src/pages/FuelManagementPage.jsx',
  'src/pages/FuelAnalysisPage.jsx',
  'src/pages/FuelLogPage.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/â€”/g, '-');
  content = content.replace(/â€¦/g, '...');
  content = content.replace(/âˆ’/g, '-');
  content = content.replace(/â€“/g, '-');
  content = content.replace(/â• /g, '=');
  content = content.replace(/â”€/g, '-');
  content = content.replace(/â†’/g, '->');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}
