const fs = require('fs');
const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Block 1 (handleSave)
content = content.replace(
/    const todayYMD = \`\$\{new Date\(\)\.getFullYear\(\)\}-\$\{String\(new Date\(\)\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\)\}-\$\{String\(new Date\(\)\.getDate\(\)\)\.padStart\(2, '0'\)\}\`;\r?\n    if \(dateStr === todayYMD\) \{\r?\n      try \{\r?\n        const childDocRef = doc\(db, "children", activeUser\.id\.toString\(\)\);\r?\n        await setDoc\(childDocRef, \{\r?\n          isTodayActive: true,\r?\n          lastAttendanceDate: new Date\(\)\.toLocaleDateString\('en-CA'\)\r?\n        \}, \{ merge: true \}\);\r?\n      \} catch \(err\) \{\r?\n        console\.error\("本日スイッチの連動に失敗しました:", err\);\r?\n      \}\r?\n    \}/g,
`    if (isToday(selectedDate)) {
      try {
        const childDocRef = doc(db, "children", activeUser.id.toString());
        // スマホSafari等でも確実にハイフン区切り(Chrome互換)にするための手動構築
        const todayString = \`\${new Date().getFullYear()}-\${String(new Date().getMonth() + 1).padStart(2, '0')}-\${String(new Date().getDate()).padStart(2, '0')}\`;
        await setDoc(childDocRef, {
          isTodayActive: true,
          lastAttendanceDate: todayString
        }, { merge: true });
      } catch (err) {
        console.error("本日スイッチの連動に失敗しました:", err);
      }
    }`
);

// Block 2 (handleDelete)
content = content.replace(
/      const todayYMD = \`\$\{new Date\(\)\.getFullYear\(\)\}-\$\{String\(new Date\(\)\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\)\}-\$\{String\(new Date\(\)\.getDate\(\)\)\.padStart\(2, '0'\)\}\`;\r?\n      if \(dateStr === todayYMD\) \{\r?\n        try \{\r?\n          const childDocRef = doc\(db, "children", activeUser\.id\.toString\(\)\);\r?\n          await setDoc\(childDocRef, \{\r?\n            isTodayActive: false\r?\n          \}, \{ merge: true \}\);\r?\n        \} catch \(err\) \{\r?\n          console\.error\("本日スイッチの連動（OFF）に失敗しました:", err\);\r?\n        \}\r?\n      \}/g,
`      if (isToday(selectedDate)) {
        try {
          const childDocRef = doc(db, "children", activeUser.id.toString());
          await setDoc(childDocRef, {
            isTodayActive: false
          }, { merge: true });
        } catch (err) {
          console.error("本日スイッチの連動（OFF）に失敗しました:", err);
        }
      }`
);

// Block 3 (handleBulkCopySave)
content = content.replace(
/      const todayYMD = \`\$\{new Date\(\)\.getFullYear\(\)\}-\$\{String\(new Date\(\)\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\)\}-\$\{String\(new Date\(\)\.getDate\(\)\)\.padStart\(2, '0'\)\}\`;\r?\n      if \(dateStr === todayYMD\) \{\r?\n        try \{\r?\n          const childDocRef = doc\(db, "children", activeUser\.id\.toString\(\)\);\r?\n          await setDoc\(childDocRef, \{\r?\n            isTodayActive: true,\r?\n            lastAttendanceDate: new Date\(\)\.toLocaleDateString\('en-CA'\)\r?\n          \}, \{ merge: true \}\);\r?\n        \} catch \(err\) \{\r?\n          console\.error\("一括コピー時の本日スイッチ連動に失敗しました:", err\);\r?\n        \}\r?\n      \}/g,
`      if (isToday(d)) {
        try {
          const childDocRef = doc(db, "children", activeUser.id.toString());
          const todayString = \`\${new Date().getFullYear()}-\${String(new Date().getMonth() + 1).padStart(2, '0')}-\${String(new Date().getDate()).padStart(2, '0')}\`;
          await setDoc(childDocRef, {
            isTodayActive: true,
            lastAttendanceDate: todayString
          }, { merge: true });
        } catch (err) {
          console.error("一括コピー時の本日スイッチ連動に失敗しました:", err);
        }
      }`
);

fs.writeFileSync(file, content);
