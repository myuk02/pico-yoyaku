const fs = require('fs');
const file = 'src/app/staff/calendar/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
/      await setDoc\(docRef, newBookingObj\);\r?\n    \} else \{\r?\n      await deleteDoc\(docRef\);\r?\n    \}/g,
`      await setDoc(docRef, newBookingObj);
      
      const isTodayDate = (d) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
      };
      if (isTodayDate(targetDate)) {
        try {
          const childDocRef = doc(db, "children", id);
          const todayString = \`\${new Date().getFullYear()}-\${String(new Date().getMonth() + 1).padStart(2, '0')}-\${String(new Date().getDate()).padStart(2, '0')}\`;
          await setDoc(childDocRef, {
            isTodayActive: true,
            lastAttendanceDate: todayString
          }, { merge: true });
        } catch (err) {
          console.error("本日スイッチの連動に失敗しました:", err);
        }
      }
    } else {
      await deleteDoc(docRef);
      
      const isTodayDate = (d) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
      };
      if (isTodayDate(targetDate)) {
        try {
          const childDocRef = doc(db, "children", id);
          await setDoc(childDocRef, {
            isTodayActive: false
          }, { merge: true });
        } catch (err) {
          console.error("本日スイッチの連動（OFF）に失敗しました:", err);
        }
      }
    }`
);

fs.writeFileSync(file, content);
