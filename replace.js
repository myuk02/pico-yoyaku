const fs = require('fs');

let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Update activeUser and familyMembers types
code = code.replace(
  'const [activeUser, setActiveUser] = useState<{id: string|number, name: string} | null>(null);',
  'const [activeUser, setActiveUser] = useState<{id: string|number, name: string, facilityId?: string} | null>(null);'
);

code = code.replace(
  'const [familyMembers, setFamilyMembers] = useState<{id: string|number, name: string}[]>([]);',
  'const [familyMembers, setFamilyMembers] = useState<{id: string|number, name: string, facilityId?: string}[]>([]);'
);

// 2. Fetch facilityId from Firestore
code = code.replace(
  /name: d\.data\(\)\.name \|\| "名称未設定"/g,
  'name: d.data().name || "名称未設定",\n              facilityId: d.data().facilityId'
);

// 3. Replace currentFacilityId state with derived value, and remove useEffect
const oldFacilityCode = `
  // モックのユーザー・施設情報（将来的にはPropsやContextから取得する）
  // 施設側で選択中の施設と確実に連携できるよう、localStorageから取得
  const [currentFacilityId, setCurrentFacilityId] = useState("facility-1774355827269");

  useEffect(() => {
    const storedFacility = localStorage.getItem('pico_selected_facility');
    const FACILITY_MAP: Record<string, string> = {
      "芦津": "facility-1773884904073",
      "テスト用": "facility-1774355827269",
    };
    const storedFacilityId = localStorage.getItem('pico_selected_facility_id');
    if (storedFacilityId) {
      setCurrentFacilityId(storedFacilityId);
    } else if (storedFacility && FACILITY_MAP[storedFacility]) {
      setCurrentFacilityId(FACILITY_MAP[storedFacility]);
    } else {
      // 異なるブラウザでテストする場合も考慮し、デフォルトを「テスト用」とする
      setCurrentFacilityId("facility-1774355827269");
    }
  }, []);
`;

const newFacilityCode = `
  // 対象の施設IDは、現在画面に読み込まれている「児童のデータ」から動的に取得する
  const currentFacilityId = activeUser?.facilityId;
`;

code = code.replace(oldFacilityCode, newFacilityCode);

// 4. Update the announcement fetch guard
code = code.replace(
  'if (!isInitialized || !activeUser?.id) return;',
  'if (!isInitialized || !activeUser?.id || !currentFacilityId) return;'
);

// 5. Update the memos fetch guard just in case it needs facilityId? 
// No, memos fetch uses child doc. The save memo uses currentFacilityId.
// Let's make sure save methods that use currentFacilityId are guarded.
// Actually handleSave, handleBulkCopySave already have: if (!activeUser) return;
// If currentFacilityId is undefined, what happens? 
// We should check !currentFacilityId in handleSave.
code = code.replace(
  'const handleSave = async () => {\n    if (!activeUser) return;',
  'const handleSave = async () => {\n    if (!activeUser || !currentFacilityId) return;'
);

code = code.replace(
  'const handleBulkCopySave = async () => {\n    if (!activeUser) return;',
  'const handleBulkCopySave = async () => {\n    if (!activeUser || !currentFacilityId) return;'
);

code = code.replace(
  "const saveHistoryToFirestore = async (newDate: Date, actionType: 'create' | 'edit' | 'delete', bulkCount: number = 1) => {\n    if (!activeUser) return;",
  "const saveHistoryToFirestore = async (newDate: Date, actionType: 'create' | 'edit' | 'delete', bulkCount: number = 1) => {\n    if (!activeUser || !currentFacilityId) return;"
);

// memo save:
// if (memoInput.trim()) {
//   newMemos[dateKey] = {
//     text: memoInput.trim(),
//     userId: activeUser.id.toString(),
//     facilityId: currentFacilityId
//   };
// }
// if currentFacilityId is undefined, it sets undefined. Which is better than sending to wrong facility.

fs.writeFileSync('src/app/page.tsx', code, 'utf8');
console.log('Replacements complete.');
