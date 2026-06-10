"use client";

import React, { useState } from "react";
import * as JapaneseHolidays from "japanese-holidays";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Bell, 
  Users, 
  Building, 
  LayoutGrid, 
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Leaf,
  Clock,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const FACILITY_MAP: Record<string, string> = {
  "葭津": "facility-1773884904073",
  "渡": "facility-1773884917420",
  "大篠津": "facility-1773884944675",
  "湯梨浜": "facility-1773884954458",
  "テスト用": "facility-1774355827269",
};

export default function UserCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeBadgeIndex, setActiveBadgeIndex] = useState<number | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    pickup: "", pickupTBD: false, pickupPlaceId: null as number | null, dropoff: "", dropoffTBD: false, dropoffPlaceId: null as number | null
  });

  const [copySourceIndex, setCopySourceIndex] = useState<number | null>(null);
  const [selectedCopyIndices, setSelectedCopyIndices] = useState<number[]>([]);

  // Custom dropdown state and refs
  const [openSelect, setOpenSelect] = useState<'pickup'|'dropoff'|'pickupPlace'|'dropoffPlace' | null>(null);
  const timeListRef = React.useRef<HTMLDivElement>(null);
  const selectedTimeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (openSelect && timeListRef.current && selectedTimeRef.current) {
      timeListRef.current.scrollTop = selectedTimeRef.current.offsetTop - (timeListRef.current.clientHeight / 2) + (selectedTimeRef.current.clientHeight / 2);
    }
  }, [openSelect]);

  // Utilities for drumroll picker
  const toHalfWidth = (str: string) => str.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  const toFullWidth = (str: string) => str.replace(/[0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
  
  const parseTime = (fullWidthTimeStr: string) => {
    if (!fullWidthTimeStr) return { h: "14", m: "30" };
    const half = toHalfWidth(fullWidthTimeStr);
    const [h, m] = half.split(":");
    return { h: h || "14", m: m || "30" };
  };

  const formatTime = (h: string, m: string) => `${toFullWidth(h)}:${toFullWidth(m)}`;

  const generateTimeOptions = () => {
    const options = [];
    for (let h = 8; h <= 18; h++) {
      for (let m = 0; m < 60; m += 5) {
        if (h === 18 && m > 30) continue;
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        options.push(formatTime(hh, mm));
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const { id } = React.use(params);
  
  // Real users from Firestore for the dropdown
  const [mockUsers, setMockUsers] = useState<any[]>([]);
  // Dedicated state for the current user being viewed
  const [currentUser, setCurrentUser] = useState<any>({ id, name: "読み込み中..." });

  const pickupLocations = React.useMemo(() => {
    return Array.isArray(currentUser?.pickupLocation) ? currentUser.pickupLocation : [];
  }, [currentUser?.pickupLocation]);

  const dropoffLocations = React.useMemo(() => {
    return Array.isArray(currentUser?.dropoffLocation) ? currentUser.dropoffLocation : [];
  }, [currentUser?.dropoffLocation]);

  React.useEffect(() => {
    // 1. Fetch dropdown list based on facility
    const fetchUsers = async () => {
      try {
        const storedFacility = localStorage.getItem("pico_selected_facility");
        const facilityId = localStorage.getItem('pico_selected_facility_id') || FACILITY_MAP[storedFacility || "葭津"] || FACILITY_MAP["葭津"];
        const qUsers = query(collection(db, "children"), where("facilityId", "==", facilityId));
        const snap = await getDocs(qUsers);
        const users = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || "未設定" }));
        setMockUsers(users);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();

    // 2. Fetch specific current user directly using URL ID
    const fetchCurrentUser = async () => {
      try {
        if (!id) return;
        const docRef = doc(db, "children", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrentUser({ 
            id: docSnap.id, 
            name: data.name || "未設定",
            pickupLocation: Array.isArray(data.pickupLocation) ? data.pickupLocation : [],
            dropoffLocation: Array.isArray(data.dropoffLocation) ? data.dropoffLocation : []
          });
        } else {
          setCurrentUser({ id, name: "利用者なし" });
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
        setCurrentUser({ id, name: "エラー" });
      }
    };
    fetchCurrentUser();
  }, [id]);

  // Calendar data for May 2026 (mockup data)
  const initialCalendarDays = [
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "scheduled", date: 1, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 2, pickup: "１０:００", pickupPlaceId: 1, dropoff: "１７:００", dropoffPlaceId: 1 },
    
    { type: "holiday", date: 3 },
    { type: "holiday", date: 4 },
    { type: "holiday", date: 5 },
    { type: "holiday", date: 6 },
    { type: "scheduled", date: 7, pickup: "１４:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 8, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "register", date: 9 },
    
    { type: "holiday", date: 10 },
    { type: "scheduled", date: 11, pickup: "０９:００", pickupPlaceId: 1, dropoff: "１７:００", dropoffPlaceId: 1 },
    { type: "scheduled", date: 12, pickup: "１４:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 13, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 14, pickup: "１４:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 15, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 16, pickup: "１０:００", pickupPlaceId: 1, dropoff: "１７:００", dropoffPlaceId: 1 },
    
    { type: "holiday", date: 17 },
    { type: "scheduled", date: 18, pickup: "１４:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 19, pickup: "１４:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 20, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 21, pickup: "１４:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "register", date: 22 },
    { type: "scheduled", date: 23, pickup: "１０:００", pickupPlaceId: 1, dropoff: "１７:００", dropoffPlaceId: 1 },
    
    { type: "holiday", date: 24 },
    { type: "scheduled", date: 25, pickup: "１４:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 26, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 27, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 28, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 29, pickup: "１３:３０", pickupPlaceId: 3, dropoff: "１７:３０", dropoffPlaceId: 1 },
    { type: "scheduled", date: 30, pickup: "１０:００", pickupPlaceId: 1, dropoff: "１７:００", dropoffPlaceId: 1 },
    
    { type: "holiday", date: 31 },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
    { type: "empty", date: null },
  ];

  const generateCalendarForMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push({ type: "empty", date: null });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const mockDay = (year === 2026 && month === 4) ? initialCalendarDays.find(d => d.date === i) : null;
      if (mockDay) {
        days.push(mockDay.type === "scheduled" ? { ...mockDay, status: "confirmed" } : { ...mockDay });
      } else {
        const dow = new Date(year, month, i).getDay();
        days.push({ type: dow === 0 ? "holiday" : "register", date: i });
      }
    }
    
    while (days.length < 42) {
      days.push({ type: "empty", date: null });
    }
    return days;
  };

  const [isClient, setIsClient] = useState(false);
  React.useEffect(() => setIsClient(true), []);

  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (monthParam) {
      const [year, month] = monthParam.split('-');
      if (year && month) {
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      }
    }
    return new Date();
  });
  
  const [calendarDaysState, setCalendarDaysState] = useState(() => 
    generateCalendarForMonth(currentDate.getFullYear(), currentDate.getMonth())
  );

  const [parentBookings, setParentBookings] = useState<any[]>([]);
  const [memos, setMemos] = useState<Record<string, any>>({});
  const [facilityHolidays, setFacilityHolidays] = useState<{ specificDates: string[], regularDays: number[] }>({ specificDates: [], regularDays: [] });
  const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = useState(false);
  const [maxDaysPerMonth, setMaxDaysPerMonth] = useState<number>(999);
  const [isLimitAlertOpen, setIsLimitAlertOpen] = useState(false);
  
  React.useEffect(() => {
    if (isClient && id) {
      // ユーザー情報等の取得
      const unsubUser = onSnapshot(doc(db, "children", id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const mDays = typeof data.days === 'number' ? data.days : parseInt(data.days, 10);
          setMaxDaysPerMonth(isNaN(mDays) ? 999 : mDays);
        }
      });
      
      const storedMemos = localStorage.getItem(`pico_parent_memos_${id}`) || localStorage.getItem("pico_parent_memos");
      if (storedMemos) {
        setMemos(JSON.parse(storedMemos));
      }
      const storedHolidays = localStorage.getItem("pico_facility_holidays");
      if (storedHolidays) {
        setFacilityHolidays(JSON.parse(storedHolidays));
      }
      
      return () => { unsubUser(); };
    }
  }, [isClient, id]);

  React.useEffect(() => {
    if (isClient && id) {
      // 現在表示している月の前後1ヶ月分のデータを取得
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const startDateStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
      
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0); 
      const endDateStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`;

      const q = query(
        collection(db, "children", id, "bookings"),
        where("date", ">=", startDateStr),
        where("date", "<=", endDateStr)
      );

      const unsubBookings = onSnapshot(q, (snap) => {
        const bookings = snap.docs.map(doc => doc.data());
        setParentBookings(bookings);
      });
      
      return () => { unsubBookings(); };
    }
  }, [isClient, id, currentDate]);


  const isFacilityHoliday = (year: number, month: number, day: number) => {
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    const isNationalHoliday = JapaneseHolidays.isHoliday(dateObj);
    
    // Parse saved YYYY-MM-DD strings and compare numeric components for exact matching
    const isSpecificDate = facilityHolidays.specificDates.some(savedDate => {
      const [y, m, dNum] = savedDate.split('-');
      return parseInt(y, 10) === year && 
             parseInt(m, 10) === month + 1 && 
             parseInt(dNum, 10) === day;
    });

    return isSpecificDate || facilityHolidays.regularDays.includes(dayOfWeek) || (facilityHolidays.regularDays.includes(7) && Boolean(isNationalHoliday));
  };

  React.useEffect(() => {
    if (!isClient) return;
    
    const days = generateCalendarForMonth(currentDate.getFullYear(), currentDate.getMonth());
    
    const newDays = days.map(day => {
      if (!day.date) return day;
      
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day.date);
      
      const booking = parentBookings.find(b => {
        if (!b || !b.date) return false;
        let bDate;
        if (typeof b.date.toDate === 'function') {
          bDate = b.date.toDate();
        } else if (typeof b.date === 'string' && b.date.includes('-')) {
          const [y, m, d] = b.date.split('T')[0].split('-');
          bDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        } else {
          bDate = new Date(b.date);
        }
        return bDate.getFullYear() === dateObj.getFullYear() && 
               bDate.getMonth() === dateObj.getMonth() && 
               bDate.getDate() === dateObj.getDate();
      });

      if (booking) {
        const pLoc = pickupLocations.find((l: any) => l?.name === booking.pickup?.place) || pickupLocations[0];
        const dLoc = dropoffLocations.find((l: any) => l?.name === booking.dropoff?.place) || dropoffLocations[0];
        
        return {
          ...day,
          type: "scheduled",
          pickup: toFullWidth(booking.pickup?.time || ""),
          pickupPlaceId: pLoc?.id || null,
          dropoff: toFullWidth(booking.dropoff?.time || ""),
          dropoffPlaceId: dLoc?.id || null,
          status: booking.status
        };
      } else {
        if (day.type === "scheduled") {
           return { ...day, type: "register" };
        }
      }
      return day;
    });

    setCalendarDaysState(newDays);
  }, [currentDate, isClient, parentBookings, pickupLocations, dropoffLocations]);

  const updateParentBooking = async (dayIndex: number, newDayState: any) => {
    const dayDate = newDayState.date;
    if (!dayDate) return;
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayDate);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const pLoc = pickupLocations.find((l: any) => l.id === newDayState.pickupPlaceId);
    const dLoc = dropoffLocations.find((l: any) => l.id === newDayState.dropoffPlaceId);
    
    const docRef = doc(db, "children", id, "bookings", dateStr);
    
    if (newDayState.type === "scheduled") {
      const newBookingObj = {
        date: dateStr, // store as string YYYY-MM-DD to be consistent and easy to query
        pickup: {
          time: toHalfWidth(newDayState.pickup || ""),
          place: pLoc ? pLoc.name : "未定"
        },
        dropoff: {
          time: toHalfWidth(newDayState.dropoff || ""),
          place: dLoc ? dLoc.name : "未定"
        },
        status: newDayState.status || "unconfirmed",
        userId: id,
        facilityId: localStorage.getItem('pico_selected_facility_id') || FACILITY_MAP[localStorage.getItem("pico_selected_facility") || "葭津"] || FACILITY_MAP["葭津"]
      };
      await setDoc(docRef, newBookingObj);
      

    } else {
      await deleteDoc(docRef);
      

    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const toggleStatus = (index: number) => {
    const newDays = [...calendarDaysState];
    const day = newDays[index];
    if ('status' in day) {
      newDays[index] = {
        ...day,
        status: day.status === "unconfirmed" ? "confirmed" : "unconfirmed"
      };
      updateParentBooking(index, newDays[index]);
    }
    setCalendarDaysState(newDays);
    setActiveBadgeIndex(null);
  };

  const handleSave = () => {
    if (editingIndex === null) return;
    const newDays = [...calendarDaysState];
    
    const isNew = newDays[editingIndex].type !== "scheduled";
    if (isNew) {
      const currentCount = newDays.filter(d => d.type === "scheduled").length;
      if (currentCount >= maxDaysPerMonth) {
        setIsLimitAlertOpen(true);
        return;
      }
    }
    
    const finalPickup = editForm.pickupTBD ? "未定" : editForm.pickup;
    const finalDropoff = editForm.dropoffTBD ? "未定" : editForm.dropoff;
    const finalPickupPlaceId = editForm.pickupPlaceId;
    const finalDropoffPlaceId = editForm.dropoffPlaceId;
    
    const hasAnyTBD = 
      finalPickup === "未定" || 
      finalDropoff === "未定" || 
      finalPickupPlaceId === null || 
      finalDropoffPlaceId === null;

    newDays[editingIndex] = {
      ...newDays[editingIndex],
      type: "scheduled",
      status: hasAnyTBD ? "unconfirmed" : ((newDays[editingIndex] as any).status || "confirmed"),
      pickup: finalPickup,
      pickupPlaceId: finalPickupPlaceId,
      dropoff: finalDropoff,
      dropoffPlaceId: finalDropoffPlaceId,
    } as any;
    
    updateParentBooking(editingIndex, newDays[editingIndex]);
    setCalendarDaysState(newDays);
    setEditingIndex(null);
  };

  const handleDelete = () => {
    if (editingIndex === null) return;
    const newDays = [...calendarDaysState];
    newDays[editingIndex] = {
      type: "register",
      date: newDays[editingIndex].date,
    } as any;
    
    updateParentBooking(editingIndex, newDays[editingIndex]);
    setCalendarDaysState(newDays);
    setEditingIndex(null);
  };

  const handleBulkConfirm = () => {
    const hasTarget = calendarDaysState.some(day => {
      const d = day as any;
      if (d.status !== "unconfirmed") return false;
      const hasTBD = d.pickup === "未定" || d.dropoff === "未定" || d.pickupPlace === "未定" || d.dropoffPlace === "未定";
      return !hasTBD;
    });

    if (!hasTarget) {
      alert("一括承認の対象となるデータ（未定を含まない未確認データ）はありません。");
      return;
    }

    setIsBulkApproveModalOpen(true);
  };

  const executeBulkApprove = async () => {
    const newDays = calendarDaysState.map(day => {
      const d = day as any;
      if (d.status === "unconfirmed") {
        const hasTBD = d.pickup === "未定" || d.dropoff === "未定" || d.pickupPlace === "未定" || d.dropoffPlace === "未定";
        if (!hasTBD) {
          return { ...day, status: "confirmed" };
        }
      }
      return day;
    });
    setCalendarDaysState(newDays);
    
    // Update all newly confirmed to Firestore
    for (const nd of newDays) {
      if (nd.type === "scheduled" && nd.date) {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), nd.date);
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        
        const existing = parentBookings.find(b => {
          if (typeof b.date === 'string' && b.date.includes('-')) return b.date === dateStr;
          const bDate = new Date(b.date);
          return bDate.getFullYear() === targetDate.getFullYear() && 
                 bDate.getMonth() === targetDate.getMonth() && 
                 bDate.getDate() === targetDate.getDate();
        });
        
        if (existing && (existing as any).status !== (nd as any).status) {
          const docRef = doc(db, "children", id, "bookings", dateStr);
          await setDoc(docRef, { ...existing, status: (nd as any).status }, { merge: true });
        }
      }
    }
    
    setIsBulkApproveModalOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#a1ddf0] text-gray-800 max-w-[1400px] print:max-w-none mx-auto w-full print:[print-color-adjust:exact]">
      {/* ---------------- Main Calendar Content ---------------- */}
      <div className="flex-1 bg-[#a1ddf0] flex flex-col">
        
        {/* Calendar Header */}
        <header className="relative z-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => router.back()} className="text-gray-600 hover:bg-white/50 p-2 rounded-full transition-colors active:scale-95 print:hidden">
              <X size={24} />
            </button>
            <div className="flex items-center gap-3">
              <button onClick={handlePrevMonth} className="bg-white text-gray-500 hover:text-gray-800 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 print:hidden">
                <ChevronLeft size={18} />
              </button>
              <span className="text-[20px] font-black tracking-wide text-gray-800 w-auto min-w-[144px] px-2 whitespace-nowrap text-center">
                {toFullWidth(currentDate.getFullYear().toString())}年{toFullWidth((currentDate.getMonth() + 1).toString())}月
              </span>
              <button onClick={handleNextMonth} className="bg-white text-gray-500 hover:text-gray-800 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 print:hidden">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* User Dropdown Trigger */}
            <div 
              className="relative print:static flex items-center gap-2 text-gray-600 font-bold text-lg cursor-pointer hover:opacity-80 transition-opacity print:flex-row print:justify-start"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <img src="/usagi_icon.png" alt="usagi" className="h-12 translate-y-4 object-contain drop-shadow-sm opacity-90" />
              <span className="text-[12px] ml-1 print:hidden">▼</span>
              <span className="ml-2 text-gray-800 print:text-3xl print:whitespace-nowrap print:inline-block print:translate-y-2">{currentUser.name}<span className="text-[14px] print:text-xl font-medium ml-1">さん</span></span>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                    }}
                  />
                  <div className="absolute top-[calc(100%+12px)] right-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {mockUsers.map((user) => (
                      <Link
                        key={user.id}
                        href={`/staff/calendar/${user.id}`}
                        className={`block w-full px-5 py-3.5 text-left transition-colors ${
                          user.id === currentUser.id 
                            ? "bg-[#DDF2FF]/60 text-[#3DB2D3] font-black" 
                            : "text-gray-600 hover:bg-gray-50 font-bold"
                        }`}
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[15px] tracking-wide">{user.name}</span>
                            <span className="text-[13px] font-medium ml-1 opacity-80">さん</span>
                          </div>
                          {user.id === currentUser.id && (
                            <CheckCircle2 size={16} strokeWidth={3} className="text-[#3DB2D3]" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button 
              onClick={handleBulkConfirm}
              className="bg-[#3DB2D3] hover:bg-[#329ab8] text-white px-6 py-2.5 rounded-full font-bold shadow-md transition-transform active:scale-95 flex items-center gap-2 print:hidden"
            >
              一括承認
            </button>
          </div>
        </header>

        {/* Calendar Grid Container */}
        <div className="flex-1 px-6 pb-6 flex flex-col">
          <div className="bg-white flex-1 max-h-[800px] min-h-[600px] rounded-2xl shadow-sm border border-gray-300 flex flex-col overflow-hidden">
            
            {/* Days of Week */}
            <div className="grid grid-cols-7 border-b border-gray-300 divide-x divide-gray-300">
              {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                <div key={day} className={`py-3 text-center text-[15px] font-bold ${
                  i === 0 ? 'text-[#FF6B8B]' : i === 6 ? 'text-[#3DB2D3]' : 'text-gray-700'
                }`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            {(() => {
              const isSixthRowEmpty = calendarDaysState.slice(35).every(cell => cell.date === null);
              const daysToRender = isSixthRowEmpty ? calendarDaysState.slice(0, 35) : calendarDaysState;
              const gridRowsClass = isSixthRowEmpty ? 'grid-rows-5' : 'grid-rows-6';
              
              return (
                <div className={`flex-1 grid grid-cols-7 ${gridRowsClass} divide-x divide-y divide-gray-300 border-t border-gray-300`}>
                  {daysToRender.map((cell, i) => {
                    const isHol = cell.date ? isFacilityHoliday(currentDate.getFullYear(), currentDate.getMonth(), cell.date) : false;
                    
                    return (
                    <div key={i} className={`relative p-2 flex flex-col group hover:bg-[#F2F9F9]/50 transition-colors ${activeBadgeIndex === i ? 'z-30' : 'z-0'}`}>
                  
                  {/* Decorative background images for empty spaces */}
                  {cell.type === "empty" && i < 35 && ((i * 3 + currentDate.getMonth()) % 4 === 0) && (
                    <img 
                      src={`/c_${((i + currentDate.getMonth()) % 10) + 1}.png`} 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto h-[48px] max-w-[90%] object-contain pointer-events-none" 
                      alt="" 
                    />
                  )}
                  
                  {cell.date && (
                    <>
                      <div className="flex items-center gap-1 mb-1 relative z-10">
                        <div className={`text-[16px] font-bold ${(i % 7) === 0 || cell.type === 'holiday' || isHol ? 'text-[#FF6B8B]' : 'text-gray-500'}`}>
                          {cell.date}
                        </div>
                      </div>
                    </>
                  )}

                  {(cell.type === "holiday" || isHol) && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[#FF6B8B] font-bold text-[14px]">休</span>
                    </div>
                  )}

                  {!isHol && cell.type === "register" && (
                    <div className="flex-1 flex items-center justify-center">
                      <button 
                        className="bg-[#99D8E9] hover:bg-[#3DB2D3] text-white text-[12px] font-bold px-4 py-1.5 rounded-full transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditForm({
                            pickup: "１４:３０",
                            pickupTBD: false,
                            pickupPlaceId: 3,
                            dropoff: "１７:３０",
                            dropoffTBD: false,
                            dropoffPlaceId: 1
                          });
                          setEditingIndex(i);
                        }}
                      >
                        登録する
                      </button>
                    </div>
                  )}

                  {!isHol && cell.type === "scheduled" && (
                    <>
                      <div className="absolute top-2 right-2 flex flex-col items-end z-40">
                        <button 
                          className={`text-[11px] font-bold flex items-center gap-0.5 hover:opacity-70 transition-opacity ${(cell as any).status === 'unconfirmed' ? 'text-rose-400' : 'text-[#3DB2D3]'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBadgeIndex(activeBadgeIndex === i ? null : i);
                          }}
                        >
                          {(cell as any).status === 'unconfirmed' ? (
                            <>
                              <XCircle size={13} strokeWidth={2.5} />
                              未承認
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} strokeWidth={2.5} />
                              承認済
                            </>
                          )}
                        </button>
                        
                        {/* Popup Menu */}
                        {activeBadgeIndex === i && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBadgeIndex(null);
                              }}
                            />
                            <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button 
                                className="w-full text-left px-4 py-3 text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStatus(i);
                                }}
                              >
                                {(cell as any).status === 'unconfirmed' ? '承認済にする' : '未承認にする'}
                              </button>
                              <button 
                                className="w-full text-left px-4 py-3 text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditForm({
                                    pickup: (cell as any).pickup === "未定" ? timeOptions[0] : ((cell as any).pickup || ""),
                                    pickupTBD: (cell as any).pickup === "未定",
                                    pickupPlaceId: (cell as any).pickupPlaceId || null,
                                    dropoff: (cell as any).dropoff === "未定" ? timeOptions[0] : ((cell as any).dropoff || ""),
                                    dropoffTBD: (cell as any).dropoff === "未定",
                                    dropoffPlaceId: (cell as any).dropoffPlaceId || null
                                  });
                                  setEditingIndex(i);
                                  setActiveBadgeIndex(null);
                                }}
                              >
                                編集・削除する
                              </button>
                              <button 
                                className="w-full text-left px-4 py-3 text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCopySourceIndex(i);
                                  setSelectedCopyIndices([]);
                                  setActiveBadgeIndex(null);
                                }}
                              >
                                別の日にも同じ登録をする
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex-1 flex items-center justify-center mt-2 w-full px-0.5">
                        {/* お迎え（左側） */}
                        <div className="flex flex-col items-center gap-0.5 text-center">
                          <span className={`font-bold text-sm tracking-tight whitespace-nowrap ${(cell as any).pickup === '未定' ? 'text-gray-500' : 'text-gray-800'}`}>{(cell as any).pickup}</span>
                          {(() => {
                            const name = pickupLocations.find((l: any) => l.id === (cell as any).pickupPlaceId)?.name;
                            return <span className={`text-xs font-medium whitespace-nowrap ${!name ? 'text-gray-400' : 'text-gray-500'}`}>{name || '未設定'}</span>;
                          })()}
                        </div>
                        
                        <div className="text-gray-300 text-[10px] mx-1.5">▶</div>
                        
                        {/* お送り（右側） */}
                        <div className="flex flex-col items-center gap-0.5 text-center">
                          <span className={`font-bold text-sm tracking-tight whitespace-nowrap ${(cell as any).dropoff === '未定' ? 'text-gray-500' : 'text-gray-800'}`}>{(cell as any).dropoff}</span>
                          {(() => {
                            const name = dropoffLocations.find((l: any) => l.id === (cell as any).dropoffPlaceId)?.name;
                            return <span className={`text-xs font-medium whitespace-nowrap ${!name ? 'text-gray-400' : 'text-gray-500'}`}>{name || '未設定'}</span>;
                          })()}
                        </div>
                      </div>
                    </>
                  )}

                  {cell.date && (() => {
                     const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2, '0')}-${String(cell.date).padStart(2, '0')}`;
                     const memo = memos[dateStr];
                     return (
                       <div className="mt-auto w-full pt-1 pb-0.5 px-0.5 truncate text-[11px] text-gray-500 font-medium text-center pointer-events-none min-h-[20px]">
                         {memo && memo.text ? `※${memo.text}` : <span className="opacity-0">※</span>}
                       </div>
                     );
                  })()}
                </div>
              )})}
                </div>
              );
            })()}

          </div>
        </div>
      </div>
      {/* Copy Modal */}
      {copySourceIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setCopySourceIndex(null);
              setSelectedCopyIndices([]);
            }}
          />
          <div className="relative bg-white rounded-[24px] w-full max-w-[340px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 flex flex-col items-center border-4 border-[#99D8E9]">
            
            <h3 className="text-[16px] font-bold text-slate-700 tracking-wide text-center">
              反映する日を選んでください。
            </h3>
            <p className="text-[12px] text-slate-500 mt-1 mb-4 font-medium text-center">
              ※複数選択可能です
            </p>

            {/* Mini Calendar Header */}
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-[16px] font-bold text-gray-800">2026年5月</span>
              <div className="flex items-center gap-4 text-gray-800">
                <button className="hover:opacity-70 active:scale-95 transition-transform"><ChevronLeft size={18} strokeWidth={2.5} /></button>
                <button className="hover:opacity-70 active:scale-95 transition-transform"><ChevronRight size={18} strokeWidth={2.5} /></button>
              </div>
            </div>

            {/* Mini Calendar Grid */}
            <div className="w-full px-1">
              {/* Days of Week */}
              <div className="grid grid-cols-7 mb-2">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                  <div key={day} className={`text-center text-[12px] font-bold ${
                    i === 0 ? 'text-[#FF6B8B]' : 'text-gray-800'
                  }`}>
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-7 gap-y-1">
                {calendarDaysState.map((cell, i) => {
                  if (!cell.date) {
                    return <div key={i} className="aspect-square flex items-center justify-center"></div>;
                  }
                  
                  const isSource = i === copySourceIndex;
                  const isHoliday = cell.type === 'holiday';
                  const isSelected = selectedCopyIndices.includes(i);
                  const isSunday = i % 7 === 0;

                  return (
                    <div key={i} className="aspect-square flex items-center justify-center">
                      <button
                        disabled={isSource || isHoliday}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCopyIndices(prev => prev.filter(idx => idx !== i));
                          } else {
                            setSelectedCopyIndices(prev => [...prev, i]);
                          }
                        }}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-all
                          ${isSource ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : ''}
                          ${!isSource && isHoliday ? 'text-[#FF6B8B]/40 cursor-not-allowed' : ''}
                          ${!isSource && !isHoliday && isSelected ? 'bg-emerald-50 border-2 border-[#3DB2D3] text-[#3DB2D3]' : ''}
                          ${!isSource && !isHoliday && !isSelected ? (isSunday ? 'text-[#FF6B8B]' : 'text-gray-700') + ' hover:bg-gray-100 active:scale-95' : ''}
                        `}
                      >
                        {cell.date}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="w-full mt-7 space-y-4 px-1">
              <button 
                onClick={() => {
                  if (selectedCopyIndices.length === 0) return;
                  const sourceDay = calendarDaysState[copySourceIndex];
                  const newDays = [...calendarDaysState];
                  selectedCopyIndices.forEach(idx => {
                    newDays[idx] = {
                      ...newDays[idx],
                      type: "scheduled",
                      pickup: (sourceDay as any).pickup,
                      pickupPlaceId: (sourceDay as any).pickupPlaceId,
                      dropoff: (sourceDay as any).dropoff,
                      dropoffPlaceId: (sourceDay as any).dropoffPlaceId,
                      status: "unconfirmed"
                    } as any;
                    updateParentBooking(idx, newDays[idx]);
                  });
                  setCalendarDaysState(newDays);
                  setCopySourceIndex(null);
                  setSelectedCopyIndices([]);
                }}
                className={`w-full py-3.5 rounded-full font-bold text-[15px] shadow-sm transition-all tracking-wide ${
                  selectedCopyIndices.length > 0 
                    ? 'bg-[#3DB2D3] hover:bg-[#329ab8] text-white active:scale-95' 
                    : 'bg-[#E5E7EB] text-gray-400 cursor-not-allowed'
                }`}
              >
                登録する
              </button>
              
              <button 
                onClick={() => {
                  setCopySourceIndex(null);
                  setSelectedCopyIndices([]);
                }}
                className="w-full block text-center text-[#FF6B8B] font-bold text-[14px] hover:opacity-80 transition-opacity"
              >
                キャンセル
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit/Delete Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingIndex(null)}
          />
          <div className="relative bg-white rounded-[24px] w-full max-w-[340px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 border-4 border-[#99D8E9]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="text-[16px] font-bold text-gray-800 tracking-wide">
                {calendarDaysState[editingIndex].type === 'register' ? '新規登録' : '登録変更'}
              </h3>
              <button onClick={() => setEditingIndex(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Date */}
            <div className="px-5 pb-4">
              <div className="text-[17px] font-bold text-gray-800 pb-3 border-b border-dashed border-gray-400">
                2026年5月{calendarDaysState[editingIndex].date}日（{['日', '月', '火', '水', '木', '金', '土'][editingIndex % 7]}）
              </div>
            </div>
            
            <div className="px-5 space-y-4">
              {/* Pickup */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditForm({...editForm, pickupTBD: !editForm.pickupTBD})}
                  className="flex items-center space-x-1.5 w-fit group"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${editForm.pickupTBD ? 'bg-[#3DB2D3] border-[#3DB2D3]' : 'border border-gray-400 bg-white group-hover:border-[#3DB2D3]'}`}>
                    {editForm.pickupTBD && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
                  </div>
                  <span className="text-[12px] text-gray-500 font-bold">未定</span>
                </button>
                <div className="flex items-center justify-between">
                  <label className="text-[14px] text-gray-500 font-bold w-24">お迎え時間</label>
                  <div className={`relative flex-1 bg-white ${editForm.pickupTBD ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div 
                    className="w-full border border-gray-400 rounded-xl py-2 pl-4 pr-10 text-[16px] font-bold text-gray-800 cursor-pointer tracking-wider flex items-center"
                    onClick={() => setOpenSelect(openSelect === 'pickup' ? null : 'pickup')}
                  >
                    {editForm.pickupTBD ? '未定' : editForm.pickup}
                  </div>
                  <Clock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  
                  {openSelect === 'pickup' && (
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={() => setOpenSelect(null)} />
                      <div 
                        ref={timeListRef}
                        className="absolute left-0 top-[calc(100%+4px)] w-full max-h-[220px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-[120] py-1"
                      >
                        {timeOptions.map(t => {
                          const isSelected = t === editForm.pickup;
                          return (
                            <button
                              key={t}
                              ref={isSelected ? selectedTimeRef : null}
                              className={`w-full text-left px-4 py-2 text-[16px] font-bold tracking-wider hover:bg-[#F2F9F9] transition-colors ${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}`}
                              onClick={() => {
                                setEditForm({...editForm, pickup: t});
                                setOpenSelect(null);
                              }}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

              <div className="flex items-center justify-between">
                <label className="text-[14px] text-gray-500 font-bold w-24">場所</label>
                <div className="relative flex-1 bg-white">
                  <div 
                    className="w-full border border-gray-400 rounded-xl py-2 pl-4 pr-10 text-[16px] font-bold text-gray-800 cursor-pointer flex items-center"
                    onClick={() => setOpenSelect(openSelect === 'pickupPlace' ? null : 'pickupPlace')}
                  >
                    {pickupLocations.find((l: any) => l.id === editForm.pickupPlaceId)?.name || '未設定'}
                  </div>
                  <MapPin size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  
                  {openSelect === 'pickupPlace' && (
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={() => setOpenSelect(null)} />
                      <div 
                        ref={timeListRef}
                        className="absolute left-0 top-[calc(100%+4px)] w-full max-h-[220px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-[120] py-1"
                      >
                        {pickupLocations.map((p: any) => {
                          const isSelected = p.id === editForm.pickupPlaceId;
                          return (
                            <button
                              key={p.id}
                              className={`w-full text-left px-4 py-2 text-[16px] font-bold hover:bg-[#F2F9F9] transition-colors ${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}`}
                              onClick={() => {
                                setEditForm({...editForm, pickupPlaceId: p.id});
                                setOpenSelect(null);
                              }}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-2"></div>

              {/* Dropoff */}
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditForm({...editForm, dropoffTBD: !editForm.dropoffTBD})}
                  className="flex items-center space-x-1.5 w-fit group"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${editForm.dropoffTBD ? 'bg-[#3DB2D3] border-[#3DB2D3]' : 'border border-gray-400 bg-white group-hover:border-[#3DB2D3]'}`}>
                    {editForm.dropoffTBD && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
                  </div>
                  <span className="text-[12px] text-gray-500 font-bold">未定</span>
                </button>
                <div className="flex items-center justify-between">
                  <label className="text-[14px] text-gray-500 font-bold w-24">お送り時間</label>
                  <div className={`relative flex-1 bg-white ${editForm.dropoffTBD ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div 
                    className="w-full border border-gray-400 rounded-xl py-2 pl-4 pr-10 text-[16px] font-bold text-gray-800 cursor-pointer tracking-wider flex items-center"
                    onClick={() => setOpenSelect(openSelect === 'dropoff' ? null : 'dropoff')}
                  >
                    {editForm.dropoffTBD ? '未定' : editForm.dropoff}
                  </div>
                  <Clock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  
                  {openSelect === 'dropoff' && (
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={() => setOpenSelect(null)} />
                      <div 
                        ref={timeListRef}
                        className="absolute left-0 top-[calc(100%+4px)] w-full max-h-[220px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-[120] py-1"
                      >
                        {timeOptions.map(t => {
                          const isSelected = t === editForm.dropoff;
                          return (
                            <button
                              key={t}
                              ref={isSelected ? selectedTimeRef : null}
                              className={`w-full text-left px-4 py-2 text-[16px] font-bold tracking-wider hover:bg-[#F2F9F9] transition-colors ${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}`}
                              onClick={() => {
                                setEditForm({...editForm, dropoff: t});
                                setOpenSelect(null);
                              }}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

              <div className="flex items-center justify-between">
                <label className="text-[14px] text-gray-500 font-bold w-24">場所</label>
                <div className="relative flex-1 bg-white">
                  <div 
                    className="w-full border border-gray-400 rounded-xl py-2 pl-4 pr-10 text-[16px] font-bold text-gray-800 cursor-pointer flex items-center"
                    onClick={() => setOpenSelect(openSelect === 'dropoffPlace' ? null : 'dropoffPlace')}
                  >
                    {dropoffLocations.find((l: any) => l.id === editForm.dropoffPlaceId)?.name || '未設定'}
                  </div>
                  <MapPin size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  
                  {openSelect === 'dropoffPlace' && (
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={() => setOpenSelect(null)} />
                      <div 
                        ref={timeListRef}
                        className="absolute left-0 top-[calc(100%+4px)] w-full max-h-[220px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-[120] py-1"
                      >
                        {dropoffLocations.map((p: any) => {
                          const isSelected = p.id === editForm.dropoffPlaceId;
                          return (
                            <button
                              key={p.id}
                              className={`w-full text-left px-4 py-2 text-[16px] font-bold hover:bg-[#F2F9F9] transition-colors ${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}`}
                              onClick={() => {
                                setEditForm({...editForm, dropoffPlaceId: p.id});
                                setOpenSelect(null);
                              }}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 pb-2">
                <button 
                  onClick={handleSave}
                  className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3.5 rounded-full font-bold text-[16px] shadow-md transition-colors active:scale-95 tracking-wide"
                >
                  {calendarDaysState[editingIndex].type === 'register' ? '登録する' : '変更する'}
                </button>
              </div>
            </div>

            {/* Footer / Delete */}
            {calendarDaysState[editingIndex].type !== 'register' && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-400 relative flex justify-center pb-5 overflow-hidden">
                <button onClick={handleDelete} className="text-rose-400 font-bold text-[14px] hover:opacity-80 transition-opacity z-10 bg-white/80 px-2 py-0.5 rounded">
                  削除する
                </button>
                <img src="/usagi_2.png" alt="" className="absolute right-2 bottom-0 h-14 object-contain opacity-40 pointer-events-none" />
                <img src="/usagi_2.png" alt="" className="absolute left-2 bottom-2 h-8 object-contain opacity-30 pointer-events-none -scale-x-100" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Limit Alert Modal */}
      {isLimitAlertOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[340px] rounded-[24px] p-6 relative shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-[#E8F7FB] rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="text-[#3DB2D3]" size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-[15px] font-bold text-gray-800 mb-2 leading-relaxed">
              登録日数が上限に達しているため<br/>登録できません
            </h2>
            <div className="w-full mt-6">
              <button 
                onClick={() => setIsLimitAlertOpen(false)}
                className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98]"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approve Confirmation Modal */}
      {isBulkApproveModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[340px] rounded-[24px] p-6 relative shadow-2xl flex flex-col text-center">
            <h2 className="text-[18px] font-black text-gray-800 mb-3 tracking-wide">一括承認しますか？</h2>
            <p className="text-[14px] text-gray-600 font-bold mb-1">
              当該月の登録を全て承認済にします。
            </p>
            <p className="text-[12px] text-gray-400 font-medium mb-6">
              ※未定の場合は承認済になりません
            </p>
            <div className="flex items-center gap-3 w-full">
              <button 
                onClick={() => setIsBulkApproveModalOpen(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 py-3 rounded-full font-bold text-[14px] transition-colors active:scale-95"
              >
                戻る
              </button>
              <button 
                onClick={executeBulkApprove}
                className="flex-1 bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3 rounded-full font-bold text-[14px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
              >
                一括承認する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
