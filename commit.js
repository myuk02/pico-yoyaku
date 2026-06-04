const { execSync } = require('child_process');
const cwd = 'c:/Users/myukf/Desktop/riyou_yoyaku';
try {
  execSync('git config user.name "AI Assistant"', {cwd});
  execSync('git config user.email "ai@example.com"', {cwd});
} catch(e) {}
execSync('git add .', {cwd});
execSync('git commit -m "カレンダーデータ永続化成功まで"', {cwd});
console.log('success');
