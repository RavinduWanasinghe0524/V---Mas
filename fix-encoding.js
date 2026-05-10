const fs = require('fs');
const files = [
  'ems-frontend/src/pages/FuelManagementPage.jsx',
  'ems-frontend/src/pages/FuelAnalysisPage.jsx',
  'ems-frontend/src/pages/FuelLogPage.jsx'
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
