"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Bell, 
  Users, 
  Building, 
  LayoutGrid, 
  LogOut,
  ChevronDown,
  Book,
  CheckCircle2,
  X
} from "lucide-react";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import * as JapaneseHolidays from "japanese-holidays";
import { collection, query, where, onSnapshot, collectionGroup, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const FACILITY_MAP: Record<string, string> = {
  "葭津": "facility-1773884904073",
  "渡": "facility-1773884917420",
  "大篠津": "facility-1773884944675",
  "湯梨浜": "facility-1773884954458",
  "テスト用": "facility-1774355827269",
};

export default function StaffHome() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const pathname = usePathname();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("未確認のみ表示");
  const [isHistoryFilterOpen, setIsHistoryFilterOpen] = useState(false);
  const [isFacilityOpen, setIsFacilityOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState("葭津");
  const [facilities, setFacilities] = useState<string[]>(["葭津", "渡", "大篠津", "湯梨浜", "テスト用"]);
  const [facilityMapState, setFacilityMapState] = useState<Record<string, string>>(FACILITY_MAP);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [facilityHolidays, setFacilityHolidays] = useState<{ specificDates: string[], regularDays: number[] }>({ specificDates: [], regularDays: [] });
  const [showToast, setShowToast] = useState<{message: string, visible: boolean}>({message: "", visible: false});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('pico_change_history');
      if (storedHistory) {
        setHistoryData(JSON.parse(storedHistory));
      }
      const storedHolidays = localStorage.getItem("pico_facility_holidays");
      if (storedHolidays) {
        setFacilityHolidays(JSON.parse(storedHolidays));
      }
      const storedFacility = localStorage.getItem('pico_selected_facility');
      if (storedFacility) {
        setSelectedFacility(storedFacility);
      }
    } catch(e) {}
    setIsInitialized(true);
  }, []);

  // リアルタイムで施設一覧を取得
  useEffect(() => {
    if (!isClient) return;
    const unsub = onSnapshot(collection(db, "facilities"), (snap) => {
      const newMap: Record<string, string> = { ...FACILITY_MAP };
      const newFacs: string[] = [];
      snap.docs.forEach(doc => {
         const name = doc.data().name || doc.id;
         newMap[name] = doc.id;
         newFacs.push(name);
      });
      if (newFacs.length > 0) {
        setFacilityMapState(newMap);
        setFacilities(newFacs);
      }
    });
    return () => unsub();
  }, [isClient]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('pico_selected_facility', selectedFacility);
    const resolvedId = facilityMapState[selectedFacility] || facilityMapState["葭津"] || FACILITY_MAP["葭津"];
    localStorage.setItem('pico_selected_facility_id', resolvedId);
    window.dispatchEvent(new Event('pico_facility_changed'));
  }, [selectedFacility, isInitialized, facilityMapState]);


  const isFacilityHoliday = (dateObj: Date) => {
    const dayOfWeek = dateObj.getDay();
    const isNationalHoliday = JapaneseHolidays.isHoliday(dateObj);
    const isSpecificDate = facilityHolidays.specificDates.some(savedDate => {
      const [y, m, dNum] = savedDate.split('-');
      return parseInt(y, 10) === dateObj.getFullYear() && 
             parseInt(m, 10) === dateObj.getMonth() + 1 && 
             parseInt(dNum, 10) === dateObj.getDate();
    });
    return isSpecificDate || facilityHolidays.regularDays.includes(dayOfWeek) || (facilityHolidays.regularDays.includes(7) && Boolean(isNationalHoliday));
  };

  const toggleHistoryItem = (id: string | number) => {
    const newData = historyData.map(h => h.id === id ? { ...h, status: h.status === '未確認' ? '確認済' : '未確認' } : h);
    setHistoryData(newData);
    localStorage.setItem('pico_change_history', JSON.stringify(newData));
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const startDay = startOfWeek(startOfMonth(currentMonth));
  const endDay = endOfWeek(endOfMonth(currentMonth));
  const calendarDays = eachDayOfInterval({ start: startDay, end: endDay });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const [users, setUsers] = useState<any[]>([]);
  const [realBookings, setRealBookings] = useState<any[]>([]);

  const [dailyStatus, setDailyStatus] = useState<Record<number, 'red' | 'blue'>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isClient) return;
    const facilityId = facilityMapState[selectedFacility] || facilityMapState["葭津"] || FACILITY_MAP["葭津"];
    const qUsers = query(collection(db, "children"), where("facilityId", "==", facilityId));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || "名称未設定", ...doc.data() }));
      setUsers(fetched);
    });
    return () => unsubUsers();
  }, [selectedFacility, isClient, facilityMapState]);

  useEffect(() => {
    if (!isClient) return;
    
    // 現在の表示月から前後1ヶ月分（計3ヶ月分）のデータを取得
    const startDateStr = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
    const endDateStr = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");
    const facilityId = facilityMapState[selectedFacility] || facilityMapState["葭津"] || FACILITY_MAP["葭津"];

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
  }, [isClient, currentMonth, selectedFacility, facilityMapState]);

  useEffect(() => {
    if (!isClient) return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const newStatus: Record<number, 'red' | 'blue'> = {};
    
    realBookings.forEach(booking => {
      const isForFacilityUser = users.some(u => booking.userId === u.id || (booking._refPath && booking._refPath.includes(`children/${u.id}/`)));
      if (!isForFacilityUser || !booking.date) return;
      
      let bDate;
      if (booking.date && typeof booking.date.toDate === 'function') {
        bDate = booking.date.toDate();
      } else if (typeof booking.date === 'string' && booking.date.includes('-')) {
        const [y, m, d] = booking.date.split('T')[0].split('-');
        bDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      } else {
        bDate = new Date(booking.date);
      }
      
      if (bDate.getFullYear() === year && bDate.getMonth() === month) {
         const day = bDate.getDate();
         if (booking.status === "unconfirmed") {
            newStatus[day] = 'red';
         } else if (newStatus[day] !== 'red') {
            newStatus[day] = 'blue';
         }
      }
    });
    
    setDailyStatus(newStatus);
  }, [currentMonth, isClient, users, realBookings]);

  const toggleBookingStatus = async (userBookingRef: string | undefined, currentStatus: boolean) => {
    if (!userBookingRef) return;
    try {
      const docRef = doc(db, userBookingRef);
      await updateDoc(docRef, {
        status: currentStatus ? "unconfirmed" : "confirmed"
      });
    } catch (err) {
      console.error(err);
    }
  };

  const currentDayBookings = useMemo(() => {
    return realBookings.filter(b => {
      const isForFacilityUser = users.some(u => b.userId === u.id || (b._refPath && b._refPath.includes(`children/${u.id}/`)));
      if (!isForFacilityUser || !b.date) return false;
      let bDate;
      if (b.date && typeof b.date.toDate === 'function') {
        bDate = b.date.toDate();
      } else if (typeof b.date === 'string' && b.date.includes('-')) {
        const [y, m, d] = b.date.split('T')[0].split('-');
        bDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      } else {
        bDate = new Date(b.date);
      }
      return isSameDay(bDate, selectedDate);
    });
  }, [realBookings, users, selectedDate]);
  
  const confirmedCount = currentDayBookings.filter(b => b.status === 'confirmed').length;
  const unconfirmedCount = currentDayBookings.filter(b => b.status !== 'confirmed').length;

  return (
    <div className="flex h-screen text-gray-800 overflow-hidden" style={{ backgroundColor: '#f0f9ff' }}>
      {/* ---------------- Sidebar ---------------- */}
      <aside className="w-[180px] min-w-[180px] shrink-0 bg-white border-r border-gray-100 flex flex-col relative shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        
        {/* Logo / Header */}
        <div className="px-4 pt-8 pb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <img src="/pick_icon.png" alt="Pico Logo" className="w-8 h-8 object-contain brightness-95 contrast-110" />
            <span className="text-[22px] font-black tracking-widest text-gray-800">Pico!</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">利用予約システム</span>
        </div>
        
        {/* Separator */}
        <div className="w-[80%] mx-auto border-b-2 border-dashed border-slate-400 mb-4"></div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-2">
          <Link href="/staff" className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all active:scale-[0.98] group ${pathname === '/staff' ? 'bg-[#3DB2D3] text-white shadow-[0_4px_12px_rgba(61,178,211,0.25)]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
            <LayoutGrid size={20} className={pathname === '/staff' ? '' : 'group-hover:text-gray-700 transition-colors'} />
            <span className="text-[14px]">ホーム</span>
          </Link>
          
          <Link href="/staff/announcements" className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all active:scale-[0.98] group ${pathname === '/staff/announcements' ? 'bg-[#3DB2D3] text-white shadow-[0_4px_12px_rgba(61,178,211,0.25)]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
            <Bell size={20} className={pathname === '/staff/announcements' ? '' : 'group-hover:text-gray-700 transition-colors'} />
            <span className="text-[14px]">お知らせ</span>
          </Link>
          
          <Link href="/staff/users" className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all active:scale-[0.98] group ${pathname === '/staff/users' ? 'bg-[#3DB2D3] text-white shadow-[0_4px_12px_rgba(61,178,211,0.25)]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
            <Users size={20} className={pathname === '/staff/users' ? '' : 'group-hover:text-gray-700 transition-colors'} />
            <span className="text-[14px]">利用者</span>
          </Link>
          
          <Link href="/staff/facility" className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all active:scale-[0.98] group ${pathname === '/staff/facility' ? 'bg-[#3DB2D3] text-white shadow-[0_4px_12px_rgba(61,178,211,0.25)]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
            <Building size={20} className={pathname === '/staff/facility' ? '' : 'group-hover:text-gray-700 transition-colors'} />
            <span className="text-[14px]">施設情報</span>
          </Link>
          
          <button 
            onClick={(e) => { e.preventDefault(); setIsContactModalOpen(true); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-[#F2F9F9] hover:text-[#3DB2D3] rounded-2xl font-bold transition-all active:scale-[0.98] group"
          >
            <Book size={20} className="text-gray-400 group-hover:text-[#3DB2D3] transition-colors" />
            <span className="text-[14px]">連絡帳</span>
          </button>
        </nav>
        
        {/* Bottom Area */}
        <div className="mt-auto px-3 pb-6 flex flex-col items-center">
          <button 
            onClick={() => {
              document.cookie = "__session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[#FF6B8B] hover:bg-[#FFF0F3] hover:text-[#f1597a] rounded-2xl font-bold transition-all active:scale-[0.98] mb-4"
          >
            <LogOut size={20} />
            <span className="text-[14px]">ログアウト</span>
          </button>
          
          <div className="w-full flex justify-center">
            <img 
              src="/usagi_5.png" 
              alt="usagi" 
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>
      </aside>

      {/* ---------------- Main Content ---------------- */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: '#a1ddf0' }}>
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-8 py-5 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.01)] z-10 sticky top-0">
          <div className="flex items-center gap-6">
            <div className="relative group z-50">
              <button
                onClick={() => setIsFacilityOpen(!isFacilityOpen)}
                className="flex items-center justify-between min-w-[160px] bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-2.5 pl-5 pr-4 rounded-xl font-bold text-lg outline-none cursor-pointer shadow-sm transition-colors"
              >
                {selectedFacility}
                <ChevronDown size={20} className={`text-white transition-transform ${isFacilityOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isFacilityOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 py-2 overflow-hidden">
                  {facilities.map((fac) => (
                    <button
                      key={fac}
                      onClick={() => {
                        setSelectedFacility(fac);
                        setIsFacilityOpen(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100 ${
                        selectedFacility === fac ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-700"
                      }`}
                    >
                      {fac}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="h-8 w-px bg-gray-200"></div>
            
            <div className="flex items-center gap-6">
              <span className="text-[22px] font-black text-gray-700 tracking-wide">
                {format(selectedDate, "yyyy年M月d日", { locale: ja })}<span className="text-lg text-gray-500 ml-1 font-bold">({format(selectedDate, "E", { locale: ja })})</span>
              </span>
              <div className="flex items-center gap-3">
                <div className="bg-[#EAF5F5] border border-[#3DB2D3]/20 text-[#3DB2D3] px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                  <Users size={16} />
                  利用者：{confirmedCount}人
                </div>
                <div className="bg-[#FFF0F3] border border-[#FF6B8B]/20 text-[#FF6B8B] px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                  <Bell size={16} />
                  未承認：{unconfirmedCount}件
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* List Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-6xl mx-auto">
            
            {/* Title & Icon Area */}
            <div className="flex items-end justify-between mb-4 relative">
              <h2 className="text-[22px] font-bold text-gray-700 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gray-700 rounded-full"></div>
                選択日の利用予約一覧
              </h2>
              <div className="absolute right-12 -bottom-4">
                <img 
                  src="/usagi_4.png" 
                  alt="usagi icon" 
                  className="w-20 h-20 object-contain object-bottom opacity-95 drop-shadow-[0_0_6px_rgba(136,212,178,0.5)]" 
                />
              </div>
            </div>

            {/* List Container */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
              
              {/* List Items */}
              <div className="flex flex-col">
                {(() => {
                  if (!isClient) return [];
                  
                  // ReactのuseMemoに相当するメモ化は、親コンポーネントレベルで行うのが理想ですが、
                  // ここでは即時関数の実行を最小限に留めるため、既に計算済みの currentDayBookings を活用します。
                  const displayUsers = users.reduce((acc: any[], user) => {
                    const booking = currentDayBookings.find(b => 
                      b.userId === user.id || (b._refPath && b._refPath.includes(`children/${user.id}/`))
                    );

                    if (booking) {
                      acc.push({
                        ...user,
                        pickupTime: booking.pickup?.time === "未定" ? "未定" : (booking.pickup?.time || user.pickupTime || "未定"),
                        pickupPlace: booking.pickup?.place || user.pickupPlace || "未指定",
                        dropoffTime: booking.dropoff?.time === "未定" ? "未定" : (booking.dropoff?.time || user.dropoffTime || "未定"),
                        dropoffPlace: booking.dropoff?.place || user.dropoffPlace || "未指定",
                        isConfirmed: booking.status === 'confirmed',
                        bookingRef: booking._refPath
                      });
                    }
                    return acc;
                  }, []);

                  if (displayUsers.length === 0) {
                    return (
                      <div className="py-16 text-center">
                        <p className="text-gray-400 font-bold text-[16px] tracking-wide">この日の利用予約はありません</p>
                      </div>
                    );
                  }

                  return displayUsers.map((user: any, index: number, arr: any[]) => (
                    <div key={user.id}>
                      <div className="grid grid-cols-[1fr_2fr_120px] gap-6 px-8 py-3.5 items-center hover:bg-[#F8FCFC] transition-colors group">
                        
                        {/* Name */}
                        <div className="font-medium text-[18px] text-gray-700 flex items-center">
                          <Link href={`/staff/calendar/${user.id}?month=${format(currentMonth, 'yyyy-MM')}`} className="hover:text-[#3DB2D3] hover:underline transition-colors">
                            {user.name}
                          </Link>
                        </div>
                        
                        {/* Time & Place */}
                        <div className="flex items-center gap-4 text-gray-600">
                          
                          {/* Pickup */}
                          <div className="flex-1 flex items-center gap-3">
                            <span className="font-black text-[20px] text-gray-800 tracking-tight">{user.pickupTime}</span>
                            <span className="text-[13px] text-gray-400 font-medium truncate max-w-[150px]" title={user.pickupPlace}>
                              {user.pickupPlace}
                            </span>
                          </div>
                          
                          {/* Arrow */}
                          <div className="text-gray-300">
                            <div className="text-[11px] text-gray-300">▶</div>
                          </div>
                          
                          {/* Dropoff */}
                          <div className="flex-1 flex items-center gap-3 pl-2">
                            <span className="font-black text-[20px] text-gray-800 tracking-tight">{user.dropoffTime}</span>
                            <span className="text-[13px] text-gray-400 font-medium truncate max-w-[150px]" title={user.dropoffPlace}>
                              {user.dropoffPlace}
                            </span>
                          </div>

                        </div>
                        
                        {/* Action Button */}
                        <div className="flex justify-center">
                          <button 
                            onClick={() => toggleBookingStatus(user.bookingRef, user.isConfirmed)}
                            className={`w-full text-white text-[13px] font-bold py-2 rounded-xl shadow-sm transition-all active:scale-[0.96] ${
                              user.isConfirmed 
                                ? "bg-[#3DB2D3] hover:bg-[#329ab8]" 
                                : "bg-[#FF6B8B] hover:bg-[#f1597a]"
                            }`}
                          >
                            {user.isConfirmed ? "承認済" : "未承認"}
                          </button>
                        </div>

                      </div>
                      {index < arr.length - 1 && (
                        <div className="mx-8 border-b-2 border-dashed border-slate-400"></div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            <div className="h-12"></div> {/* Bottom spacer */}
          </div>
        </main>
      </div>

      {/* ---------------- Right Area ---------------- */}
      <aside className="w-[25%] min-w-[320px] bg-white border-l border-gray-100 flex flex-col overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-8 flex flex-col gap-6">
          
          {/* Calendar Section */}
          <div className="flex flex-col gap-2.5">
            {/* Mini Calendar */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4 px-2">
                <button onClick={prevMonth} className="text-gray-400 hover:text-[#3DB2D3] transition-colors font-bold">＜</button>
                <span className="font-bold text-gray-800 text-[15px] tracking-wide">{format(currentMonth, "M月", { locale: ja })}</span>
                <button onClick={nextMonth} className="text-gray-400 hover:text-[#3DB2D3] transition-colors font-bold">＞</button>
              </div>
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-400 mb-3">
                <div className="text-rose-400">日</div>
                <div>月</div>
                <div>火</div>
                <div>水</div>
                <div>木</div>
                <div>金</div>
                <div className="text-[#3DB2D3]">土</div>
              </div>
              <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-[13px] font-medium">
                {calendarDays.map((date, i) => {
                  const dayNum = date.getDate();
                  const isCurrent = isSameMonth(date, currentMonth);
                  const isSun = i % 7 === 0;
                  const isSat = i % 7 === 6;
                  
                  const isToday = isSameDay(date, new Date());
                  const isSelected = isSameDay(date, selectedDate);
                  const isHol = isCurrent && isFacilityHoliday(date);
                  
                  let textColor = "text-gray-600";
                  if (!isCurrent) textColor = "text-gray-300";
                  else if (isSelected) textColor = "text-white";
                  else if (isSun || isHol) textColor = "text-[#FF6B8B]";
                  else if (isSat) textColor = "text-[#3DB2D3]";

                  return (
                    <div 
                      key={i} 
                      onClick={() => { if (isCurrent) setSelectedDate(date) }}
                      className={`flex flex-col items-center justify-start cursor-pointer transition-all ${!isCurrent ? "pointer-events-none" : "hover:opacity-80 active:scale-[0.95]"}`}
                    >
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full ${
                        isSelected ? "bg-[#FF6B8B] font-bold shadow-[0_2px_8px_rgba(255,107,139,0.4)]" : 
                        isToday ? "border-2 border-[#FF6B8B] font-bold" : ""
                      } ${textColor}`}>
                        {dayNum}
                      </div>
                      <div className="h-2 mt-1">
                        {isCurrent && dailyStatus[dayNum] === 'red' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B8B]"></div>
                        )}
                        {isCurrent && dailyStatus[dayNum] === 'blue' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3DB2D3]"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Weekly Calendar Link */}
            <div className="flex justify-end pr-1">
              <Link href={`/staff/calendar/weekly?date=${format(selectedDate, 'yyyy-MM-dd')}`} className="text-[#3DB2D3] text-[13px] font-bold hover:underline cursor-pointer transition-all">
                週間カレンダーを表示 <span className="ml-0.5">→</span>
              </Link>
            </div>
          </div>

          <div className="w-full border-t-2 border-dashed border-slate-400 -my-2"></div>

          {/* History Area */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-gray-700 flex items-center gap-2">
                <Bell size={18} className="text-[#3DB2D3]" />
                変更履歴
              </h3>
              <div className="relative group">
                <button 
                  onClick={() => setIsHistoryFilterOpen(!isHistoryFilterOpen)}
                  className="flex items-center justify-between w-full min-w-[140px] bg-white border border-gray-200 text-gray-600 py-1.5 pl-3 pr-2.5 rounded-xl text-[12px] font-medium outline-none focus:border-[#3DB2D3] hover:border-gray-300 cursor-pointer shadow-sm transition-colors"
                >
                  {historyFilter}
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${isHistoryFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isHistoryFilterOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-[160px] bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setHistoryFilter("未確認のみ表示");
                        setIsHistoryFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100 ${historyFilter === "未確認のみ表示" ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-600"}`}
                    >
                      未確認のみ表示
                    </button>
                    <button
                      onClick={() => {
                        setHistoryFilter("全て表示");
                        setIsHistoryFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100 ${historyFilter === "全て表示" ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-600"}`}
                    >
                      全て表示
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
              
              {historyData
                .filter(h => users.some(u => u.id.toString() === h.userId?.toString()))
                .filter(h => historyFilter === "全て表示" ? true : h.status === '未確認')
                .length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-gray-500 font-medium">
                    表示する履歴がありません
                  </div>
                ) : (
                  historyData
                    .filter(h => users.some(u => u.id.toString() === h.userId?.toString()))
                    .filter(h => historyFilter === "全て表示" ? true : h.status === '未確認')
                    .map((item) => (
                      <div key={item.id}>
                        <div className="p-4 hover:bg-[#F8FCFC] transition-colors">
                          <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                            {item.message}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between">
                            <div 
                              onClick={() => toggleHistoryItem(item.id)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold shadow-sm tracking-widest cursor-pointer transition-all hover:opacity-80 active:scale-[0.96] select-none ${
                                item.status !== '未確認' ? "bg-[#3DB2D3] text-white" : "bg-[#FF6B8B] text-white"
                              }`}
                            >
                              {item.status !== '未確認' ? "確認済" : "未確認"}
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium tracking-wide">
                              {item.timestamp ? format(new Date(item.timestamp), "yyyy年M月d日(E) HH:mm", { locale: ja }) : item.dateStr}
                            </span>
                          </div>
                        </div>
                        <div className="mx-4 border-b-2 border-dashed border-slate-400"></div>
                      </div>
                    ))
                )}

            </div>
          </div>

        </div>
      </aside>
      
      {/* Custom Toast Notification */}
      {showToast.visible && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white/90 backdrop-blur-md px-6 py-3.5 rounded-full shadow-lg border border-gray-100 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[#3DB2D3]" />
            <span className="text-[#334155] font-bold text-[14px]">{showToast.message}</span>
          </div>
        </div>
      )}

      {/* Contact Book Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[360px] rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => setIsContactModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="w-14 h-14 bg-[#EAF5F5] rounded-full flex items-center justify-center mb-5 mt-2 border-2 border-[#3DB2D3]/20">
              <Book className="text-[#3DB2D3]" size={26} strokeWidth={2.5} />
            </div>
            <h2 className="text-[17px] font-bold text-gray-800 mb-8 leading-relaxed tracking-wide">
              『Pico！連絡帳』を開きますか？
            </h2>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setIsContactModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3.5 rounded-full font-bold text-[15px] transition-all"
              >
                閉じる
              </button>
              <a 
                href="https://example.com/pico-contact"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsContactModalOpen(false)}
                className="flex-1 bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all flex items-center justify-center"
              >
                OK（進む）
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
