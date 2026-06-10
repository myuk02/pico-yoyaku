const fs = require('fs');

let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

// 1. Remove localStorage fetching of historyData
const oldUseEffect1 = `  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('pico_change_history');
      if (storedHistory) {
        setHistoryData(JSON.parse(storedHistory));
      }
      const storedHolidays = localStorage.getItem("pico_facility_holidays");`;

const newUseEffect1 = `  useEffect(() => {
    try {
      const storedHolidays = localStorage.getItem("pico_facility_holidays");`;

code = code.replace(oldUseEffect1, newUseEffect1);

// 2. Add historyData fetching from Firestore using onSnapshot
// We'll insert it right after the users fetching useEffect to maintain logical order.
const usersFetchTarget = `    return () => unsubUsers();
  }, [selectedFacility, isClient, facilityMapState]);`;

const newHistoryFetch = `    return () => unsubUsers();
  }, [selectedFacility, isClient, facilityMapState]);

  useEffect(() => {
    if (!isClient) return;
    const facilityId = facilityMapState[selectedFacility] || facilityMapState["葭津"] || FACILITY_MAP["葭津"];
    const qHistory = query(collection(db, "facilities", facilityId, "changeHistory"));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // ソート: timestampの降順（新しい順）
      fetched.sort((a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      setHistoryData(fetched);
    });
    return () => unsubHistory();
  }, [selectedFacility, isClient, facilityMapState]);`;

code = code.replace(usersFetchTarget, newHistoryFetch);

// 3. Update toggleHistoryItem to use Firestore updateDoc
const oldToggleHistory = `  const toggleHistoryItem = (id: string | number) => {
    const newData = historyData.map(h => h.id === id ? { ...h, status: h.status === '未確認' ? '確認済' : '未確認' } : h);
    setHistoryData(newData);
    localStorage.setItem('pico_change_history', JSON.stringify(newData));
  };`;

const newToggleHistory = `  const toggleHistoryItem = async (id: string | number) => {
    const facilityId = facilityMapState[selectedFacility] || facilityMapState["葭津"] || FACILITY_MAP["葭津"];
    const item = historyData.find(h => h.id === id);
    if (!item) return;
    
    // オプティミスティックUI更新（待たずに見た目を変える）
    const newData = historyData.map(h => h.id === id ? { ...h, status: h.status === '未確認' ? '確認済' : '未確認' } : h);
    setHistoryData(newData);
    
    try {
      const newStatus = item.status === '未確認' ? '確認済' : '未確認';
      const docRef = doc(db, "facilities", facilityId, "changeHistory", String(id));
      await updateDoc(docRef, { status: newStatus });
    } catch (err) {
      console.error("履歴ステータスの更新に失敗しました:", err);
      // エラー時は元に戻す（オプション）
    }
  };`;

code = code.replace(oldToggleHistory, newToggleHistory);

fs.writeFileSync('src/app/staff/page.tsx', code, 'utf8');
console.log('staff page replacement complete.');
