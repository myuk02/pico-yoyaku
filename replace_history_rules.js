const fs = require('fs');

let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Add updateDoc to imports
if (!code.includes('updateDoc')) {
  code = code.replace(/import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, documentId, getDocs } from "firebase\/firestore";/, 'import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, documentId, getDocs, updateDoc } from "firebase/firestore";');
}

// 2. Modify saveHistoryToFirestore
const oldSaveHistory = `  const saveHistoryToFirestore = async (newDate: Date, actionType: 'create' | 'edit' | 'delete', bulkCount: number = 1) => {
    if (!activeUser || !currentFacilityId) return;
    let message = "";
    if (actionType === 'create') {
      if (bulkCount >= 2) {
        message = \`\${activeUser.name}さんが\${format(newDate, 'M月')}のカレンダーに\${bulkCount}件の新規予約をしました\`;
      } else {
        message = \`\${activeUser.name}さんが\${format(newDate, 'M月d日(E)', { locale: ja })}に新規予約をしました\`;
      }
    } else if (actionType === 'edit') {
      message = \`\${activeUser.name}さんが\${format(newDate, 'M月d日(E)', { locale: ja })}の予約を変更しました\`;
    } else if (actionType === 'delete') {
      message = \`\${activeUser.name}さんが\${format(newDate, 'M月d日(E)', { locale: ja })}の予約を削除しました\`;
    }

    try {
      const historyRef = doc(collection(db, "facilities", currentFacilityId, "changeHistory"));
      await setDoc(historyRef, {
        id: historyRef.id,
        action: actionType,
        message: message,
        timestamp: new Date().toISOString(),
        status: '未確認',
        userId: activeUser.id.toString(),
        targetMonth: format(newDate, 'yyyy-MM'),
        count: bulkCount,
        facilityId: currentFacilityId
      });
    } catch (e) {
      console.error("Firestoreへの履歴保存に失敗しました", e);
    }
  };`;

const newSaveHistory = `  const saveHistoryToFirestore = async (newDate: Date, actionType: 'create' | 'edit' | 'delete', bulkCount: number = 1) => {
    if (!activeUser || !currentFacilityId) return;
    
    try {
      const now = new Date();
      const targetMonthStr = format(newDate, 'yyyy-MM');
      let aggregatedCount = bulkCount;
      let existingDocId = null;

      // 15分以内の同一アクション集約チェック
      if (actionType === 'create') {
        const q = query(
          collection(db, "facilities", currentFacilityId, "changeHistory"),
          where("userId", "==", activeUser.id.toString())
        );
        const snap = await getDocs(q);
        
        let latestTime = 0;
        let latestDocData: any = null;
        
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.action === 'create' && data.targetMonth === targetMonthStr && data.status === '未確認') {
            const t = new Date(data.timestamp).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestDocData = { id: d.id, ...data };
            }
          }
        });

        // 15分以内なら集約
        if (latestDocData && (now.getTime() - latestTime) <= 15 * 60 * 1000) {
          existingDocId = latestDocData.id;
          aggregatedCount = (latestDocData.count || 1) + bulkCount;
        }
      }

      // メッセージ構築
      let message = "";
      if (actionType === 'create') {
        if (aggregatedCount >= 2) {
          message = \`\${activeUser.name}さんが\${format(newDate, 'M月')}のカレンダーに\${aggregatedCount}件の新規予約をしました\`;
        } else {
          message = \`\${activeUser.name}さんが\${format(newDate, 'M月d日(E)', { locale: ja })}に新規予約をしました\`;
        }
      } else if (actionType === 'edit') {
        message = \`\${activeUser.name}さんが\${format(newDate, 'M月d日(E)', { locale: ja })}の予約を変更しました\`;
      } else if (actionType === 'delete') {
        message = \`\${activeUser.name}さんが\${format(newDate, 'M月d日(E)', { locale: ja })}の予約を削除しました\`;
      }

      // 更新 or 新規作成
      if (existingDocId) {
        await updateDoc(doc(db, "facilities", currentFacilityId, "changeHistory", existingDocId), {
          count: aggregatedCount,
          message: message,
          timestamp: now.toISOString()
        });
      } else {
        const historyRef = doc(collection(db, "facilities", currentFacilityId, "changeHistory"));
        await setDoc(historyRef, {
          id: historyRef.id,
          action: actionType,
          message: message,
          timestamp: now.toISOString(),
          status: '未確認',
          userId: activeUser.id.toString(),
          targetMonth: targetMonthStr,
          count: aggregatedCount,
          facilityId: currentFacilityId
        });
      }
    } catch (e) {
      console.error("Firestoreへの履歴保存に失敗しました", e);
    }
  };`;
code = code.replace(oldSaveHistory, newSaveHistory);

// 3. Modify handleDelete
const oldHandleDelete = `  const handleDelete = async () => {
    if (!activeUser) return;
    if (window.confirm("本当に削除しますか？")) {
      const dateStr = \`\${selectedDate.getFullYear()}-\${String(selectedDate.getMonth() + 1).padStart(2, '0')}-\${String(selectedDate.getDate()).padStart(2, '0')}\`;
      const docRef = doc(db, "children", activeUser.id.toString(), "bookings", dateStr);
      await deleteDoc(docRef);
      setIsModalOpen(false);

      if (isToday(selectedDate)) {
        try {
          const childDocRef = doc(db, "children", activeUser.id.toString());
          await setDoc(childDocRef, {
            isTodayActive: false
          }, { merge: true });
        } catch (err) {
          console.error("本日スイッチの連動（OFF）に失敗しました:", err);
        }
      }

      try {
        const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
        addHistoryWithAggregation(history, selectedDate, 'delete');
        localStorage.setItem('pico_change_history', JSON.stringify(history));
      } catch (e) {}
      await saveHistoryToFirestore(selectedDate, 'delete');
    }
  };`;

const newHandleDelete = `  const handleDelete = async () => {
    if (!activeUser) return;
    if (window.confirm("本当に削除しますか？")) {
      // 削除前にステータスを取得しておく
      const existingIdx = reservations.findIndex(r => isSameDay(r.date, selectedDate));
      const existingStatus = existingIdx !== -1 ? reservations[existingIdx].status : null;

      const dateStr = \`\${selectedDate.getFullYear()}-\${String(selectedDate.getMonth() + 1).padStart(2, '0')}-\${String(selectedDate.getDate()).padStart(2, '0')}\`;
      const docRef = doc(db, "children", activeUser.id.toString(), "bookings", dateStr);
      await deleteDoc(docRef);
      setIsModalOpen(false);

      if (isToday(selectedDate)) {
        try {
          const childDocRef = doc(db, "children", activeUser.id.toString());
          await setDoc(childDocRef, {
            isTodayActive: false
          }, { merge: true });
        } catch (err) {
          console.error("本日スイッチの連動（OFF）に失敗しました:", err);
        }
      }

      try {
        const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
        addHistoryWithAggregation(history, selectedDate, 'delete');
        localStorage.setItem('pico_change_history', JSON.stringify(history));
      } catch (e) {}
      
      // 承認済（confirmed）だった場合のみ履歴に残す
      if (existingStatus === 'confirmed') {
        await saveHistoryToFirestore(selectedDate, 'delete');
      }
    }
  };`;
code = code.replace(oldHandleDelete, newHandleDelete);


// 4. Modify handleBulkCopySave
const oldHandleBulk = `    setIsCopyModalOpen(false);
    setIsModalOpen(false);
    
    try {
      const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
      datesToSave.forEach(date => {
        addHistoryWithAggregation(history, date, 'create', 1);
      });
      localStorage.setItem('pico_change_history', JSON.stringify(history));
    } catch (e) {}
    
    for (const date of datesToSave) {
      await saveHistoryToFirestore(date, 'create', 1);
    }
  };`;

const newHandleBulk = `    setIsCopyModalOpen(false);
    setIsModalOpen(false);
    
    try {
      const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
      datesToSave.forEach(date => {
        addHistoryWithAggregation(history, date, 'create', 1);
      });
      localStorage.setItem('pico_change_history', JSON.stringify(history));
    } catch (e) {}
    
    // 一括コピー完了後、1回だけ履歴送信（ルール5復活）
    if (datesToSave.length > 0) {
      // 最初の対象日を使って月を判定する（件数をまとめて通知）
      await saveHistoryToFirestore(datesToSave[0], 'create', datesToSave.length);
    }
  };`;
code = code.replace(oldHandleBulk, newHandleBulk);

fs.writeFileSync('src/app/page.tsx', code, 'utf8');
console.log('page.tsx replacement complete.');
