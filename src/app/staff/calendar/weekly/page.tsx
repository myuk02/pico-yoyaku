"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Printer, UserCircle2 } from "lucide-react";
import { startOfWeek, addWeeks, subWeeks, format, addDays } from "date-fns";
import { ja } from "date-fns/locale";
import { collection, query, where, onSnapshot, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase";

const FACILITY_MAP: Record<string, string> = {
  "葭津": "facility-1773884904073",
  "渡": "facility-1773884917420",
  "大篠津": "facility-1773884944675",
  "湯梨浜": "facility-1773884954458",
  "テスト用": "facility-1774355827269",
};



// ソート関数
const sortUsers = (users: any[]) => {
  return [...users].sort((a, b) => {
    // 1. お迎え時間が早い順
    const timeA = a.pickupTime === "未定" ? "99:99" : a.pickupTime;
    const timeB = b.pickupTime === "未定" ? "99:99" : b.pickupTime;
    if (timeA < timeB) return -1;
    if (timeA > timeB) return 1;
    // 2. お迎え場所が同じもの同士
    if (a.pickupPlace < b.pickupPlace) return -1;
    if (a.pickupPlace > b.pickupPlace) return 1;
    return 0;
  });
};

function WeeklyCalendarContent() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [realBookings, setRealBookings] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    const selectedFac = localStorage.getItem('pico_selected_facility') || "葭津";
    const facilityId = FACILITY_MAP[selectedFac] || FACILITY_MAP["葭津"];
    const qUsers = query(collection(db, "children"), where("facilityId", "==", facilityId));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || "名称未設定", ...doc.data() }));
      setUsers(fetched);
    });
    return () => unsubUsers();
  }, [isClient]);

  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  // 現在表示している週の開始日（日曜日）
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        return startOfWeek(parsedDate, { weekStartsOn: 0 });
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });

  useEffect(() => {
    if (!isClient) return;
    const startDateStr = format(currentWeekStart, "yyyy-MM-dd");
    const endDateStr = format(addDays(currentWeekStart, 7), "yyyy-MM-dd");
    const selectedFac = localStorage.getItem('pico_selected_facility') || "葭津";
    const facilityId = localStorage.getItem('pico_selected_facility_id') || FACILITY_MAP[selectedFac] || FACILITY_MAP["葭津"];

    const qBookings = query(
      collectionGroup(db, "bookings"),
      where("facilityId", "==", facilityId),
      where("date", ">=", startDateStr),
      where("date", "<=", endDateStr)
    );
    const unsubBookings = onSnapshot(qBookings, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, _refPath: doc.ref.path, ...doc.data() }));
      setRealBookings(fetched);
    });
    return () => unsubBookings();
  }, [isClient, currentWeekStart]);


  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 画面外クリックでドロップダウンを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ドロップダウン用の選択肢（現在週の前後2〜3週分）
  const weekOptions = Array.from({ length: 6 }).map((_, i) => {
    const start = addWeeks(subWeeks(currentWeekStart, 2), i);
    const end = addDays(start, 6);
    return {
      start,
      end,
      label: `${format(start, "M月d日", { locale: ja })} ～ ${format(end, "M月d日", { locale: ja })}`
    };
  });

  const handleWeekSelect = (start: Date) => {
    setCurrentWeekStart(start);
    setIsDropdownOpen(false);
  };

  // 曜日ごとのデータを動的に生成（日曜は休み）
  const days = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const dateObj = addDays(currentWeekStart, i);
      const dayStr = format(dateObj, "E", { locale: ja });
      const dateStr = format(dateObj, "d");
      const isHoliday = i === 0;

      const targetDateStr = format(dateObj, "yyyy-MM-dd");
      let dataSlice: any[] = [];
      if (!isHoliday) {
        const dayBookings = realBookings.filter(b => {
          const isForUser = users.some(u => b.userId === u.id || (b._refPath && b._refPath.includes(`children/${u.id}/`)));
          
          // b.dateが存在しない古いデータや、idが日付形式(YYYY-MM-DD)になっているケースを救済
          const rawDate = b.date || b.id;
          if (!isForUser || !rawDate) return false;

          let bDate;
          if (rawDate && typeof rawDate.toDate === 'function') {
            bDate = rawDate.toDate();
          } else if (typeof rawDate === 'string' && rawDate.includes('-')) {
            const parts = rawDate.split('T')[0].split('-');
            bDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          } else {
            bDate = new Date(rawDate);
          }
          
          if (isNaN(bDate.getTime())) return false;

          // JSTのズレなどを回避するため、年・月・日の数値で完全に一致するか比較
          const targetY = dateObj.getFullYear();
          const targetM = dateObj.getMonth();
          const targetD = dateObj.getDate();
          
          return bDate.getFullYear() === targetY && 
                 bDate.getMonth() === targetM && 
                 bDate.getDate() === targetD;
        });

          dataSlice = dayBookings.map(b => {
            const user = users.find(u => b.userId === u.id || (b._refPath && b._refPath.includes(`children/${u.id}/`))) || { name: '不明' };
            return {
              id: b.id,
              name: user.name,
              pickupTime: b.pickup?.time || "未定",
              pickupPlace: b.pickup?.place || "未定",
              dropoffTime: b.dropoff?.time || "未定",
              dropoffPlace: b.dropoff?.place || "未定"
            };
          });
      }

      return {
        dayStr,
        date: dateStr,
        type: isHoliday ? "holiday" : "normal",
        data: sortUsers(dataSlice)
      };
    });
  }, [currentWeekStart, realBookings, users]);

  // パターン判定：いずれかの曜日が15人以上なら2ページ(2列)パターン
  const maxUsers = Math.max(...days.map(d => d.data.length));
  const isPattern2 = maxUsers >= 15;

  const handlePrint = () => {
    window.print();
  };

  // 空行（ダミーデータ）で配列をパディングする関数
  const padData = (data: any[], length: number) => {
    const padded = [...data];
    while (padded.length < length) {
      padded.push({ id: `dummy-${Math.random()}`, isDummy: true });
    }
    return padded;
  };

  // 印刷用の1ユーザーセルを描画する関数
  const renderUserItem = (user: any) => {
    // 名前の長さに応じてフォントサイズと文字間隔を調整
    const nameLen = user.name.length;
    let nameClass = "text-[13px] tracking-tight";
    if (nameLen >= 7) {
      nameClass = "text-[10px] tracking-tighter";
    } else if (nameLen >= 5) {
      nameClass = "text-[11.5px] tracking-tighter";
    }

    return (
      <>
        {/* 1行目 */}
        <div className="flex items-center justify-between">
          <span className={`font-bold text-gray-800 leading-none whitespace-nowrap overflow-hidden shrink min-w-0 mr-1 ${nameClass}`}>
            {user.name}
          </span>
          <div className="flex items-center text-[13px] font-black text-gray-800 shrink-0">
            <span className="w-[42px] text-right">{user.pickupTime}</span>
            <span className="mx-0.5 text-gray-400 text-[9px]">▶</span>
            <span className="w-[42px] text-right">{user.dropoffTime}</span>
          </div>
        </div>
        {/* 2行目 */}
        <div className="flex items-center justify-end mt-[2px]">
          <div className="flex items-center shrink-0 font-bold leading-none tracking-tighter text-[10.5px]">
            <span className="w-[42px] text-right truncate text-gray-400 print:text-black">{user.pickupPlace.replace("小学校", "小")}</span>
            <span className="mx-0.5 text-transparent text-[9px]">▶</span>
            <span className="w-[42px] text-right truncate text-gray-400 print:text-black">{user.dropoffPlace.replace("小学校", "小")}</span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col print:bg-white print:m-0 print:p-0">
      
      {/* --- ヘッダー --- */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm print:border-none print:px-0 print:py-2 print:shadow-none print:justify-center">
        <div className="flex items-center gap-4 print:w-full print:justify-center">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors print:hidden"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-4 ml-2 print:ml-0 print:w-full print:justify-center">
            <span className="text-[22px] font-black tracking-wide text-gray-800 print:text-center print:w-full">
              {format(currentWeekStart, "M月d日", { locale: ja })} 〜 {format(addDays(currentWeekStart, 6), "M月d日", { locale: ja })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 print:hidden">


          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`text-gray-500 font-bold text-[14px] flex items-center gap-1 hover:text-gray-700 bg-white px-3 py-1.5 rounded-lg border transition-colors ${isDropdownOpen ? 'border-gray-200 shadow-sm' : 'border-transparent'}`}
            >
              週を切り替える ▼
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-[100] overflow-hidden">
                <div className="px-3 py-2 text-[11px] font-bold text-gray-400 border-b border-gray-50 mb-1">
                  表示する週を選択
                </div>
                {weekOptions.map((opt, i) => {
                  const isSelected = opt.start.getTime() === currentWeekStart.getTime();
                  return (
                    <button
                      key={i}
                      onClick={() => handleWeekSelect(opt.start)}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors ${isSelected ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#3DB2D3] hover:bg-[#329ab8] text-white px-5 py-2.5 rounded-full font-bold shadow-md active:scale-95 transition-all"
          >
            <Printer size={18} />
            印刷する
          </button>
        </div>
      </header>

      {/* --- メインカレンダーエリア --- */}
      <main className="flex-1 p-6 overflow-x-auto print:p-0 print:overflow-visible">
        
        {/* 印刷パターンに応じたレイアウトコンテナ */}
        <div className={`min-w-[1200px] h-full mx-auto bg-white border-2 border-solid border-[#92CDE0] shadow-sm flex flex-col 
          print:shadow-none print:min-w-0 print:w-full print:[print-color-adjust:exact]
          ${isPattern2 ? 'print-pattern-2 print:border-none' : 'print-pattern-1'}`
        }>
          
          {/* ヘッダー帯 (青) - 画面表示用 および パターン1印刷用 */}
          {/* パターン2の印刷時は各ページの先頭で別々に描画するためここでは非表示にする */}
          <div className={`flex bg-[#92CDE0] print:[print-color-adjust:exact] ${isPattern2 ? 'print:hidden' : ''}`}>
            {days.map((d, i) => (
              <div 
                key={i} 
                className={`
                  relative flex flex-col border-r border-[#6FB6CD] last:border-r-0 print:border-[#6FB6CD]
                  ${d.type === 'holiday' ? 'w-16 shrink-0' : 'flex-1'}
                `}
              >
                <div className="flex justify-center items-center h-[36px] px-1 w-full">
                  <span className={`text-center leading-tight text-[15px] font-black ${i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-700' : 'text-gray-800'}`}>
                    {d.date}（{d.dayStr}）
                  </span>
                  {d.type !== 'holiday' && (
                    <span className="absolute right-2 text-[12px] font-bold text-gray-700 opacity-80">
                      {d.data.length}人
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* コンテンツエリア */}
          <div className="flex flex-1 relative print:flex-col">
            
            {/* --- Web画面用レイアウト (横一列) --- */}
            <div className="flex w-full print:hidden">
              {days.map((d, i) => (
                <div 
                  key={i} 
                  className={`
                    border-r border-[#92CDE0] last:border-r-0 flex flex-col
                    ${d.type === 'holiday' ? 'w-16 shrink-0 bg-red-50/30' : 'flex-1'}
                  `}
                >
                  {d.type === 'holiday' ? (
                    <div className="h-full"></div>
                  ) : (
                    <div className="flex flex-col pt-1">
                      {d.data.map((user, idx) => (
                        <div key={`${user.id}-${idx}`} className="flex flex-col px-1.5 py-1.5 border-b border-dashed border-gray-400 last:border-b-0">
                          {/* 1行目 */}
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-bold text-gray-800 leading-none whitespace-nowrap overflow-hidden shrink min-w-0 mr-2 ${user.name.length >= 7 ? 'text-[11px] tracking-tighter' : user.name.length >= 5 ? 'text-[12.5px] tracking-tighter' : 'text-[14px] tracking-tight'}`}>
                              {user.name}
                            </span>
                            <div className="flex items-center text-[14px] font-black text-gray-800 shrink-0">
                              <span className="w-[42px] text-right">{user.pickupTime}</span>
                              <span className="mx-1 text-[10px] text-gray-400">▶</span>
                              <span className="w-[42px] text-right">{user.dropoffTime}</span>
                            </div>
                          </div>
                          {/* 2行目 */}
                          <div className="flex items-center justify-end text-[11px] font-bold text-gray-500 leading-none">
                            <div className="flex items-center shrink-0">
                              <span className="w-[42px] text-right truncate text-gray-400" title={user.pickupPlace}>{user.pickupPlace}</span>
                              <span className="mx-1 text-transparent text-[10px]">▶</span>
                              <span className="w-[42px] text-right truncate text-gray-400" title={user.dropoffPlace}>{user.dropoffPlace}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* --- 印刷用レイアウト --- */}
            
            {/* パターン1 (20人未満): 月〜土 6列を1ページに */}
            {!isPattern2 && (
              <div className="hidden print:flex w-full h-[175mm] border-b-2 border-solid border-[#92CDE0]">
                {days.map((d, i) => (
                  <div key={i} className={`border-r border-[#92CDE0] last:border-r-0 flex flex-col pt-1 ${d.type === 'holiday' ? 'w-16 shrink-0' : 'flex-1'}`}>
                    {d.type === 'holiday' ? (
                      <div className="h-full"></div>
                    ) : (
                      padData(d.data, 14).map((user, idx) => (
                        <div key={`${user.id}-${idx}`} className="flex-1 flex flex-col justify-center px-1 border-b border-dashed border-gray-400 last:border-b-0 overflow-hidden">
                          {user.isDummy ? (
                            <div className="h-full w-full"></div>
                          ) : (
                            renderUserItem(user)
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* パターン2 (20人以上): 4日ずつ2ページに分割。枠内を2列にする */}
            {isPattern2 && (
              <div className="hidden print:block w-full">
                
                {/* 1ページ目 (日・月・火・水) */}
                <div className="break-after-page border-b-2 print:border-2 border-solid border-[#92CDE0]">
                  {/* 1ページ目 ヘッダー */}
                  <div className="flex bg-[#92CDE0] print:[print-color-adjust:exact]">
                    {days.slice(0, 4).map((d, i) => (
                      <div key={i} className={`relative flex flex-col border-r border-[#6FB6CD] last:border-r-0 ${d.type === 'holiday' ? 'w-16 shrink-0' : 'flex-1'}`}>
                        <div className="flex justify-center items-center h-[36px] px-1 w-full">
                          <span className={`text-center leading-tight text-[15px] font-black ${i === 0 ? 'text-red-600' : 'text-gray-800'}`}>
                            {d.date}（{d.dayStr}）
                          </span>
                          {d.type !== 'holiday' && (
                            <span className="absolute right-2 text-[12px] font-bold text-gray-700 opacity-80">{d.data.length}人</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 1ページ目 ボディ */}
                  <div className="flex w-full h-[175mm]">
                    {days.slice(0, 4).map((d, i) => (
                      <div key={i} className={`border-r border-[#92CDE0] last:border-r-0 flex flex-col pt-1 ${d.type === 'holiday' ? 'w-16 shrink-0' : 'flex-1'}`}>
                        {d.type === 'holiday' ? (
                          <div className="h-full"></div>
                        ) : (
                          <div className="flex w-full h-full">
                            {/* 左列 */}
                            <div className="flex-1 flex flex-col border-r border-dashed border-[#92CDE0] pr-1">
                              {padData(d.data.slice(0, 14), 14).map((user, idx) => (
                                <div key={`${user.id}-${idx}`} className="flex-1 flex flex-col justify-center px-1 border-b border-dashed border-gray-400 last:border-b-0 overflow-hidden">
                                  {user.isDummy ? <div className="h-full w-full"></div> : renderUserItem(user)}
                                </div>
                              ))}
                            </div>
                            {/* 右列 */}
                            <div className="flex-1 flex flex-col pl-1">
                              {padData(d.data.slice(14, 28), 14).map((user, idx) => (
                                <div key={`${user.id}-${idx}`} className="flex-1 flex flex-col justify-center px-1 border-b border-dashed border-gray-400 last:border-b-0 overflow-hidden">
                                  {user.isDummy ? <div className="h-full w-full"></div> : renderUserItem(user)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2ページ目用 期間テキスト */}
                <div className="w-full text-center py-2 print:flex justify-center hidden">
                  <span className="text-[22px] font-black tracking-wide text-gray-800">
                    {format(currentWeekStart, "M月d日", { locale: ja })} 〜 {format(addDays(currentWeekStart, 6), "M月d日", { locale: ja })}
                  </span>
                </div>
                {/* 2ページ目 (ダミー日・木・金・土) */}
                <div className="border-t-2 border-b-2 print:border-2 border-solid border-[#92CDE0]">
                  {/* 2ページ目 ヘッダー */}
                  <div className="flex bg-[#92CDE0] print:[print-color-adjust:exact]">
                    {/* ダミー日 */}
                    <div className="relative flex flex-col border-r border-[#6FB6CD] w-16 shrink-0">
                      <div className="flex justify-center items-center h-[36px] px-1 w-full"></div>
                    </div>
                    {/* 木・金・土 */}
                    {days.slice(4, 7).map((d, i) => (
                      <div key={i} className="relative flex flex-col border-r border-[#6FB6CD] last:border-r-0 flex-1">
                        <div className="flex justify-center items-center h-[36px] px-1 w-full">
                          <span className={`text-center leading-tight text-[15px] font-black ${d.dayStr === '土' ? 'text-blue-700' : 'text-gray-800'}`}>
                            {d.date}（{d.dayStr}）
                          </span>
                          <span className="absolute right-2 text-[12px] font-bold text-gray-700 opacity-80">{d.data.length}人</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 2ページ目 ボディ */}
                  <div className="flex w-full h-[175mm]">
                    {/* ダミー日のボディ */}
                    <div className="border-r border-[#92CDE0] flex flex-col pt-1 w-16 shrink-0">
                      <div className="h-full"></div>
                    </div>
                    {/* 木・金・土のボディ */}
                    {days.slice(4, 7).map((d, i) => (
                      <div key={i} className="border-r border-[#92CDE0] last:border-r-0 flex flex-col pt-1 flex-1">
                        <div className="flex w-full h-full">
                          {/* 左列 */}
                          <div className="flex-1 flex flex-col border-r border-dashed border-[#92CDE0] pr-1">
                            {padData(d.data.slice(0, 14), 14).map((user, idx) => (
                              <div key={`${user.id}-${idx}`} className="flex-1 flex flex-col justify-center px-1 border-b border-dashed border-gray-400 last:border-b-0 overflow-hidden">
                                {user.isDummy ? <div className="h-full w-full"></div> : renderUserItem(user)}
                              </div>
                            ))}
                          </div>
                          {/* 右列 */}
                          <div className="flex-1 flex flex-col pl-1">
                            {padData(d.data.slice(14, 28), 14).map((user, idx) => (
                              <div key={`${user.id}-${idx}`} className="flex-1 flex flex-col justify-center px-1 border-b border-dashed border-gray-400 last:border-b-0 overflow-hidden">
                                {user.isDummy ? <div className="h-full w-full"></div> : renderUserItem(user)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </main>

      {/* Global CSS for printing tweaks */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .break-after-page {
            page-break-after: always;
            break-after: page;
          }
          /* Remove layout sidebars if any outside this component */
          aside, nav { display: none !important; }
        }
      `}} />
    </div>
  );
}

export default function WeeklyCalendarPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <WeeklyCalendarContent />
    </React.Suspense>
  );
}

