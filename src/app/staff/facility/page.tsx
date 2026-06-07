"use client";

import React, { useState, useEffect } from "react";
import * as JapaneseHolidays from "japanese-holidays";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building, 
  Bell, 
  LayoutGrid, 
  LogOut, 
  Users, 
  Cloud, 
  Calendar, 
  MapPin, 
  User,
  Mail,
  EyeOff,
  X,
  Clock,
  Plus,
  Trash2,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Book,
  CheckCircle2,
  CheckSquare,
  TriangleAlert,
  Lock
} from "lucide-react";
import { collection, getDocs, doc, deleteDoc, query, where, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const FACILITY_MAP: Record<string, string> = {
  "葭津": "facility-1773884904073",
  "渡": "facility-1773884917420",
  "大篠津": "facility-1773884944675",
  "湯梨浜": "facility-1773884954458",
  "テスト用": "facility-1774355827269",
};

export default function FacilitySettings() {
  const pathname = usePathname();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [masterKeyInput, setMasterKeyInput] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isAdvancedMenuOpen, setIsAdvancedMenuOpen] = useState(false);

  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState<any>(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminMasterKeyInput, setAdminMasterKeyInput] = useState("");
  const [newLoginPasscode, setNewLoginPasscode] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [isUpdatingPasscode, setIsUpdatingPasscode] = useState(false);

  const [newFacilityName, setNewFacilityName] = useState("");
  const [globalPasscode, setGlobalPasscode] = useState("");
  const [firestoreFacilities, setFirestoreFacilities] = useState<any[]>([]);
  const [facilityToDelete, setFacilityToDelete] = useState<any>(null);
  const [isDeleteFacilityModalOpen, setIsDeleteFacilityModalOpen] = useState(false);
  const [isDeletingFacility, setIsDeletingFacility] = useState(false);

  useEffect(() => {
    if (isMasterAuthenticated) {
      const q = query(collection(db, "facilities"));
      const unsubFac = onSnapshot(q, (snap) => {
        const facs = snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
        setFirestoreFacilities(facs);
      });

      const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap) => {
        if (snap.exists()) {
          setGlobalPasscode(snap.data().loginPassword || "未設定");
        } else {
          setGlobalPasscode("未設定");
        }
      });

      return () => {
        unsubFac();
        unsubSettings();
      };
    }
  }, [isMasterAuthenticated]);

  const handleConfirmDeleteUser = async () => {
    if (masterKeyInput !== "asf215") {
      setDeleteError("※マスターキーが間違っています");
      return;
    }
    if (!userToDelete) return;
    
    setIsDeletingUser(true);
    setDeleteError("");
    
    try {
      const bookingsRef = collection(db, "children", userToDelete.id.toString(), "bookings");
      const bookingsSnap = await getDocs(bookingsRef);
      for (const bookingDoc of bookingsSnap.docs) {
        await deleteDoc(doc(db, "children", userToDelete.id.toString(), "bookings", bookingDoc.id));
      }
      
      await deleteDoc(doc(db, "children", userToDelete.id.toString()));
      
      const updatedUsers = users.filter(u => u.id !== userToDelete.id);
      setUsers(updatedUsers);
      localStorage.setItem("pico_users", JSON.stringify(updatedUsers));
      window.dispatchEvent(new Event("pico_users_updated"));
      
      setShowToast({ message: "利用者を完全に削除しました", visible: true });
      setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
      
    } catch (err) {
      console.error("Error deleting user:", err);
      setDeleteError("※削除に失敗しました");
    } finally {
      setIsDeletingUser(false);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setMasterKeyInput("");
    }
  };

  // --- Reservation Deadline State ---
  const [reservationDeadline, setReservationDeadline] = useState<number>(3);
  const [isDeadlineInitialized, setIsDeadlineInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pico_reservation_deadline");
    if (!stored || stored === "7") {
      setReservationDeadline(3);
      localStorage.setItem("pico_reservation_deadline", "3");
    } else {
      setReservationDeadline(parseInt(stored, 10));
    }
    setIsDeadlineInitialized(true);
  }, []);

  useEffect(() => {
    if (isDeadlineInitialized) {
      localStorage.setItem("pico_reservation_deadline", reservationDeadline.toString());
      // Disaptch event to notify other tabs/pages
      window.dispatchEvent(new Event("pico_reservation_deadline_updated"));
    }
  }, [reservationDeadline, isDeadlineInitialized]);

  // --- Holiday Modal State ---
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // May 2026
  const [holidayChecked, setHolidayChecked] = useState<string[]>([
    "2026-5-3", "2026-5-4", "2026-5-5", "2026-5-6", 
    "2026-5-10", "2026-5-17", "2026-5-24", "2026-5-31"
  ]);
  const [regularHolidays, setRegularHolidays] = useState<number[]>([]);

  const [isDayOfWeekModalOpen, setIsDayOfWeekModalOpen] = useState(false);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [isHolidayInitialized, setIsHolidayInitialized] = useState(false);
  const [showToast, setShowToast] = useState<{message: string, visible: boolean}>({message: "", visible: false});

  useEffect(() => {
    const stored = localStorage.getItem("pico_facility_holidays");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.specificDates) setHolidayChecked(parsed.specificDates);
      if (parsed.regularDays) setRegularHolidays(parsed.regularDays);
    }
    setIsHolidayInitialized(true);
  }, []);

  useEffect(() => {
    if (isHolidayInitialized) {
      localStorage.setItem("pico_facility_holidays", JSON.stringify({
        specificDates: holidayChecked,
        regularDays: regularHolidays
      }));
    }
  }, [holidayChecked, regularHolidays, isHolidayInitialized]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const toggleHoliday = (year: number, month: number, day: number) => {
    const firstDay = getFirstDayOfMonth(year, month);
    const dayOfWeek = (firstDay + day - 1) % 7;
    const dateObj = new Date(year, month, day);
    const isHoliday = JapaneseHolidays.isHoliday(dateObj);
    
    if (regularHolidays.includes(dayOfWeek) || (regularHolidays.includes(7) && isHoliday)) {
      return;
    }
    
    const dateStr = `${year}-${month + 1}-${day}`;
    setHolidayChecked(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr) 
        : [...prev, dateStr]
    );
  };

  const toggleDayOfWeek = (dayIndex: number) => {
    setSelectedDaysOfWeek(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex) 
        : [...prev, dayIndex]
    );
  };

  const handleApplyDaysOfWeek = () => {
    setRegularHolidays(prev => Array.from(new Set([...prev, ...selectedDaysOfWeek])));
    setIsDayOfWeekModalOpen(false);
    setSelectedDaysOfWeek([]);
  };

  const handleRemoveDaysOfWeek = () => {
    setRegularHolidays(prev => prev.filter(day => !selectedDaysOfWeek.includes(day)));
    setIsDayOfWeekModalOpen(false);
    setSelectedDaysOfWeek([]);
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="border border-gray-200 h-16 bg-gray-50/30"></div>);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month + 1}-${d}`;
      const dayOfWeek = (firstDay + d - 1) % 7;
      const dateObj = new Date(year, month, d);
      const isHolidayDate = JapaneseHolidays.isHoliday(dateObj);
      const isSunday = dayOfWeek === 0;
      const isChecked = holidayChecked.includes(dateStr) || regularHolidays.includes(dayOfWeek) || (regularHolidays.includes(7) && isHolidayDate);

      days.push(
        <div key={d} className="border border-gray-200 h-16 flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors">
          <span className={`text-[13px] font-bold ${isChecked || isSunday ? 'text-[#FF6B8B]' : 'text-gray-700'}`}>
            {d}
          </span>
          <button 
            onClick={() => toggleHoliday(year, month, d)}
            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
              isChecked 
                ? 'bg-[#FF6B8B] border-[#FF6B8B]' 
                : 'bg-white border-gray-300'
            }`}
          >
            {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </button>
        </div>
      );
    }
    
    // Fill remaining cells to complete the grid (usually 42 cells total)
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = firstDay + daysInMonth; i < totalCells; i++) {
      days.push(<div key={`empty-end-${i}`} className="border border-gray-200 h-16 bg-gray-50/30"></div>);
    }

    return days;
  };

  // Fetch users from Firestore
  const [users, setUsers] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [selectedFacilityName, setSelectedFacilityName] = useState("葭津");

  useEffect(() => {
    setIsClient(true);
    const storedFacility = localStorage.getItem("pico_selected_facility");
    if (storedFacility) {
      setSelectedFacilityName(storedFacility);
    }
    
    const handleFacilityChange = () => {
      const newFacility = localStorage.getItem("pico_selected_facility");
      if (newFacility) {
        setSelectedFacilityName(newFacility);
      }
    };
    window.addEventListener("pico_facility_changed", handleFacilityChange);
    return () => window.removeEventListener("pico_facility_changed", handleFacilityChange);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    const facilityId = localStorage.getItem('pico_selected_facility_id') || FACILITY_MAP[selectedFacilityName] || FACILITY_MAP["葭津"];
    const q = query(
      collection(db, "children"), 
      where("facilityId", "==", facilityId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "名称未設定",
          status: "保護者と共有",
          days: typeof data.days === 'number' ? data.days : null,
          isHidden: data.isHidden === true,
          invitationCode: data.invitationCode || null,
        };
      });
      setUsers(fetched);
    }, (error) => {
      console.error("Error fetching users snapshot:", error);
    });

    return () => unsubscribe();
  }, [selectedFacilityName, isClient]);

  const hiddenUsers = users.filter(u => u.isHidden);

  // --- Location Modal State ---
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [locationTab, setLocationTab] = useState<'pickup' | 'dropoff'>('pickup');
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");

  const [pickupLocations, setPickupLocations] = useState([
    { id: 1, name: "家族送迎", address: "未指定" },
    { id: 2, name: "自宅", address: "未指定" },
    { id: 3, name: "県立〇〇小学校", address: "未指定" },
  ]);
  
  const [dropoffLocations, setDropoffLocations] = useState([
    { id: 1, name: "自宅", address: "未指定" },
    { id: 2, name: "祖父母宅", address: "未指定" },
  ]);

  const activeLocations = locationTab === 'pickup' ? pickupLocations : dropoffLocations;

  const handleRegisterClick = () => {
    if (!newLocationName.trim()) return;
    setIsInputModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmRegister = () => {
    const newLoc = { id: Date.now(), name: newLocationName, address: newLocationAddress || "未指定" };
    if (locationTab === 'pickup') {
      setPickupLocations([...pickupLocations, newLoc]);
    } else {
      setDropoffLocations([...dropoffLocations, newLoc]);
    }
    setIsConfirmModalOpen(false);
    setNewLocationName("");
    setNewLocationAddress("");
  };

  // --- User Info Modal State ---
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [userInfoName, setUserInfoName] = useState("");
  const [userInfoDays, setUserInfoDays] = useState("0");
  const [isUserInfoRegistered, setIsUserInfoRegistered] = useState(false);
  const [userInfoSelectedId, setUserInfoSelectedId] = useState<number | null>(null);

  const handleDecrementDays = () => {
    const val = parseInt(userInfoDays, 10) || 0;
    if (val > 0) setUserInfoDays(String(val - 1));
  };

  const handleIncrementDays = () => {
    const val = parseInt(userInfoDays, 10) || 0;
    setUserInfoDays(String(val + 1));
  };

  const handleSaveUserInfo = async () => {
    if (userInfoSelectedId === null) return;
    const newDays = parseInt(userInfoDays, 10) || 0;
    
    // UI 即時反映
    setUsers(prev => prev.map(u => 
      u.id === userInfoSelectedId 
        ? { ...u, name: userInfoName, days: newDays }
        : u
    ));
    
    // Firestore更新
    try {
      await updateDoc(doc(db, "children", userInfoSelectedId.toString()), {
        name: userInfoName,
        days: newDays
      });
    } catch(e) {
      console.error("Error updating user info:", e);
    }
    
    setIsUserInfoModalOpen(false);
  };

  const handleRestoreUser = async () => {
    if (userInfoSelectedId === null) return;
    
    // UI 即時反映
    setUsers(prev => prev.map(u => 
      u.id === userInfoSelectedId ? { ...u, isHidden: false } : u
    ));
    
    // Firestore更新
    try {
      await updateDoc(doc(db, "children", userInfoSelectedId.toString()), {
        isHidden: false
      });
    } catch(e) {
      console.error("Error restoring user:", e);
    }
    
    setIsUserInfoModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#ECF8FC] text-gray-800 overflow-hidden">
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
      <main className="flex-1 overflow-y-auto p-10 relative">
        {/* Subtle Background Elements (Clouds) */}
        <div className="fixed top-0 left-[20%] right-0 bottom-0 pointer-events-none z-0 overflow-hidden">
          <Cloud className="absolute top-[8%] right-[12%] w-[300px] h-[300px] text-[#3DB2D3] opacity-[0.03]" strokeWidth={0.5} />
          <Cloud className="absolute bottom-[10%] left-[5%] w-[250px] h-[250px] text-[#3DB2D3] opacity-[0.03]" strokeWidth={0.5} />
          <Cloud className="absolute top-[45%] right-[40%] w-[150px] h-[150px] text-[#3DB2D3] opacity-[0.03]" strokeWidth={0.5} />
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8 pl-2 relative z-10">
          <h1 className="text-[24px] font-bold text-gray-800 tracking-wide">施設情報</h1>
          <img 
            src="/usagi_8.png" 
            alt="usagi" 
            className="w-16 h-auto object-contain drop-shadow-md pointer-events-none" 
          />
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10 max-w-[1400px]">
          
          {/* Card 1: 予約可能期間設定 */}
          <div className="bg-white rounded-3xl border-4 border-[#3db2d3] p-8 flex flex-col gap-6 shadow-sm h-full relative overflow-hidden">
            <h2 className="text-[18px] font-bold text-gray-800 flex items-center gap-2 relative z-10">
              <Clock className="text-[#3db2d3]" size={22} strokeWidth={2.5} />
              予約可能期間設定
            </h2>
            <div className="flex flex-col gap-3 relative z-10">
              <label className="text-[14px] font-bold text-gray-500">利用者さんの予約可能な期間を設定してください</label>
              <div className="flex items-end gap-2">
                <input 
                  type="number" 
                  min={3}
                  value={reservationDeadline}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setReservationDeadline(Math.max(3, val));
                    }
                  }}
                  className="w-[100px] bg-gray-50 border-2 border-gray-100 focus:border-[#3db2d3] rounded-2xl px-4 py-3 text-[18px] font-bold text-gray-800 outline-none text-center" 
                />
                <span className="text-[15px] font-bold text-gray-600 mb-3">営業日前まで予約可</span>
              </div>
            </div>

            {/* うさぎ画像（右下にぴったり着地） */}
            <div className="absolute right-[16px] bottom-0 z-30 pointer-events-none">
              <img 
                src="/usagi_2.png" 
                alt="usagi" 
                className="w-[160px] h-auto object-contain" 
              />
            </div>
          </div>

          {/* Card 2: 施設の休日登録 */}
          <div className="bg-white rounded-3xl border-4 border-[#3db2d3] p-8 flex flex-col gap-6 shadow-sm h-full relative overflow-hidden">
            <h2 className="text-[18px] font-bold text-gray-800 flex items-center gap-2 relative z-10">
              <Calendar className="text-[#3db2d3]" size={22} strokeWidth={2.5} />
              施設の休日登録
            </h2>
            <div className="flex flex-col gap-3 relative z-10">
              <p className="text-gray-500 font-bold text-[14px] leading-relaxed">
                カレンダー上で施設の休日や特別休業日を設定・管理します。<br/>
                休日に設定された日は予約ができなくなります。
              </p>
              <button 
                onClick={() => setIsHolidayModalOpen(true)}
                className="mt-2 bg-[#ECF8FC] text-gray-600 hover:bg-[#d9eff7] font-bold py-3.5 px-6 rounded-2xl transition-all w-fit text-[14px] active:scale-95"
              >
                休日カレンダーを開く
              </button>
            </div>

            {/* うさぎ画像（右下にぴったり着地） */}
            <div className="absolute right-[16px] bottom-0 z-30 pointer-events-none">
              <img 
                src="/usagi_9.png" 
                alt="usagi" 
                className="w-[160px] h-auto object-contain" 
              />
            </div>
          </div>

          {/* Card 3: 管理者設定 */}
          <div className="bg-white rounded-3xl border-4 border-[#3db2d3] p-8 flex flex-col gap-6 shadow-sm h-full relative overflow-hidden">
            <h2 className="text-[18px] font-bold text-gray-800 flex items-center gap-2 relative z-10">
              <Lock className="text-[#3db2d3]" size={22} strokeWidth={2.5} />
              管理者設定
            </h2>
            <div className="flex flex-col gap-3 relative z-10 flex-1">
              <p className="text-[13px] font-bold text-gray-500/80 -mt-2 mb-2">
                施設ログインパスコードの変更、および施設管理を行います。
              </p>
              {!isMasterAuthenticated ? (
                <div className="flex-1 flex items-center justify-center min-h-[120px]">
                  <button 
                    onClick={() => setIsAdminAuthModalOpen(true)}
                    className="bg-[#2B4C5E] hover:bg-[#1E3A49] text-white py-3.5 px-8 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(43,76,94,0.3)] transition-all active:scale-[0.98] tracking-wide"
                  >
                    管理者メニューを開く
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto max-h-[360px] pr-2 pb-2">
                  
                  {/* Passcode Update */}
                  <div className="flex flex-col gap-3 bg-[#F2F7F7] p-4 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center">
                      <label className="text-[13px] font-bold text-gray-600">共通ログインパスコードの変更</label>
                      <span className="text-[13px] font-bold text-[#3db2d3] bg-white px-3 py-1 rounded-full shadow-sm border border-[#3db2d3]/20">
                        現在の共通パスコード：{globalPasscode || "取得中..."}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        maxLength={6}
                        value={newLoginPasscode}
                        onChange={(e) => {
                           const val = e.target.value.replace(/[^0-9]/g, '');
                           setNewLoginPasscode(val);
                        }}
                        placeholder="新しい6桁の数字"
                        className="flex-1 bg-white border-2 border-gray-200 focus:border-[#3db2d3] rounded-xl px-4 py-2.5 text-[16px] tracking-[0.1em] font-bold text-gray-800 outline-none" 
                      />
                      <button 
                        onClick={async () => {
                          if (newLoginPasscode.length !== 6) {
                            setShowToast({ message: "※6桁の数字を入力してください", visible: true });
                            setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
                            return;
                          }
                          setIsUpdatingPasscode(true);
                          try {
                            const globalDocRef = doc(db, "settings", "global");
                            await setDoc(globalDocRef, { loginPassword: newLoginPasscode }, { merge: true });
                            setShowToast({ message: "共通ログインパスコードを更新しました", visible: true });
                            setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
                            setNewLoginPasscode("");
                          } catch(err) {
                            console.error(err);
                            setShowToast({ message: "※更新に失敗しました", visible: true });
                            setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
                          } finally {
                            setIsUpdatingPasscode(false);
                          }
                        }}
                        disabled={isUpdatingPasscode}
                        className="bg-[#3db2d3] disabled:bg-gray-300 text-white hover:bg-[#329ab8] font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm text-[13px] active:scale-95 whitespace-nowrap"
                      >
                        {isUpdatingPasscode ? "更新中" : "更新する"}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsAdvancedMenuOpen(!isAdvancedMenuOpen)}
                    className="flex justify-between items-center w-full bg-gray-50 hover:bg-gray-100 p-3.5 rounded-xl transition-colors font-bold text-[13px] text-gray-600 border border-gray-200 mt-2"
                  >
                    施設の追加・削除（詳細）
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isAdvancedMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isAdvancedMenuOpen && (
                    <div className="flex flex-col gap-5 animate-in slide-in-from-top-2 duration-300">
                      {/* Add Facility */}
                      <div className="flex flex-col gap-3 bg-[#F2F7F7] p-4 rounded-2xl border border-gray-100">
                        <label className="text-[13px] font-bold text-gray-600">新しい施設の追加</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            maxLength={20}
                            value={newFacilityName}
                            onChange={(e) => setNewFacilityName(e.target.value)}
                            placeholder="施設名"
                            className="flex-1 bg-white border-2 border-gray-200 focus:border-[#3db2d3] rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none" 
                          />
                          <button 
                            onClick={async () => {
                              if (!newFacilityName.trim()) return;
                              try {
                                const newId = `facility-${Date.now()}`;
                                await setDoc(doc(db, "facilities", newId), { 
                                  name: newFacilityName.trim(), 
                                  users: [] // 初期状態で空の利用者リストを定義
                                });
                                setNewFacilityName("");
                                setShowToast({ message: "施設を追加しました", visible: true });
                                setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            disabled={!newFacilityName.trim()}
                            className="bg-[#2B4C5E] disabled:bg-gray-300 text-white hover:bg-[#1E3A49] font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-[13px] active:scale-95 flex items-center gap-1 whitespace-nowrap"
                          >
                            <Plus size={16} strokeWidth={3} />
                            追加
                          </button>
                        </div>
                      </div>

                      {/* Delete Facility */}
                      <div className="flex flex-col gap-3 bg-[#FFF0F3]/40 p-4 rounded-2xl border border-[#FF6B8B]/20">
                        <label className="text-[13px] font-bold text-[#FF6B8B]">施設の削除（危険）</label>
                        <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                          {Array.from(new Map([
                            ...Object.entries(FACILITY_MAP).map(([name, id]) => [id, { id, name }]),
                            ...firestoreFacilities.map(f => [f.id, f])
                          ] as any[]).values()).map((fac: any) => (
                            <div key={fac.id} className="flex justify-between items-center bg-white border border-rose-100 rounded-lg p-2 pl-3">
                              <span className="text-[13px] font-bold text-gray-700">{fac.name}</span>
                              <button
                                onClick={() => {
                                  setFacilityToDelete(fac);
                                  setIsDeleteFacilityModalOpen(true);
                                }}
                                className="text-[#FF6B8B] hover:text-rose-600 hover:bg-rose-50 w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0"
                              >
                                <Trash2 size={15} strokeWidth={2.5} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* うさぎ画像（上下いっぱい右端） */}
            <div className="absolute right-0 bottom-0 h-full z-30 pointer-events-none">
              <img 
                src="/usagi_10.png" 
                alt="usagi" 
                className="h-full w-auto object-contain" 
              />
            </div>
          </div>

          {/* Card 4: 非表示リスト */}
          <div className="bg-white rounded-3xl border-4 border-[#3db2d3] p-8 flex flex-col gap-6 shadow-sm h-full">
            <h2 className="text-[18px] font-bold text-gray-800 flex items-center gap-2">
              <EyeOff className="text-gray-400" size={22} strokeWidth={2.5} />
              非表示リスト
            </h2>
            <p className="text-[14px] text-gray-500 font-bold -mt-2">非表示フラグが設定されている利用者（アーカイブ）</p>
            
            {/* Archive List Area (Button) */}
            <div className="flex-1 flex flex-col items-center justify-center bg-[#ECF8FC] rounded-[24px] gap-3 p-6 min-h-[140px]">
              <span className="text-[13px] font-bold text-gray-500">非表示中の利用者: {hiddenUsers.length}人</span>
              <button 
                onClick={() => setIsArchiveModalOpen(true)}
                className="bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3.5 px-8 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
              >
                非表示リストを見る
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Archive Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[32px] border-[4px] border-[#B5E4F2] p-8 relative shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-[20px] font-bold text-gray-800 tracking-wide flex items-center gap-2">
                <EyeOff className="text-gray-400" size={24} strokeWidth={2.5} />
                非表示リスト
              </h2>
              <button 
                onClick={() => setIsArchiveModalOpen(false)}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95 absolute top-6 right-6"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 bg-[#ECF8FC] p-6 rounded-[24px]">
              <div className="flex flex-wrap gap-x-6 gap-y-6 items-start content-start justify-center md:justify-start">
                {hiddenUsers.map((user) => (
                  <div key={user.id} className="relative pt-[22px] group w-[165px] h-[225px] shrink-0">
                    {/* Floating Name Tag */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#EBF7FA] border border-[#3DB2D3] text-[#3DB2D3] font-bold px-4 py-1.5 rounded-t-[14px] z-10 text-[13px] tracking-wide shadow-sm text-center min-w-[110px] transition-all duration-300">
                      {user.name}
                    </div>

                    {/* Removed Delete Button from top */}

                    {/* Card Body */}
                    <div className="bg-white rounded-[24px] border-[3px] border-[#B5E4F2] p-3 flex flex-col gap-2 shadow-sm h-full relative z-0 opacity-75 grayscale-[0.2]">
                      
                      {/* Buttons Area */}
                      <div className="mt-2 flex flex-col gap-2 flex-1">
                        <Link 
                          href={`/staff/calendar/${user.id}`}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#3DB2D3] text-white text-[12px] font-bold py-2 rounded-full shadow-sm hover:bg-[#329ab8] active:scale-[0.98] transition-all"
                        >
                          <Calendar size={14} strokeWidth={2.5} />
                          個別カレンダー
                        </Link>
                        <button 
                          onClick={() => setSelectedUserId(user.id)}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#F2F7F7] text-gray-600 text-[12px] font-bold py-2 rounded-full hover:bg-[#e4ecec] active:scale-[0.98] transition-all"
                        >
                          <MapPin size={14} strokeWidth={2.5} />
                          送迎先の確認
                        </button>
                        <button 
                          onClick={() => {
                            setUserInfoSelectedId(user.id);
                            setUserInfoName(user.name);
                            const isRegistered = user.days !== null && user.days !== undefined; 
                            setIsUserInfoRegistered(isRegistered);
                            setUserInfoDays(isRegistered ? String(user.days) : "0");
                            setIsUserInfoModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#F2F7F7] text-gray-600 text-[12px] font-bold py-2 rounded-full hover:bg-[#e4ecec] active:scale-[0.98] transition-all"
                        >
                          <User size={14} strokeWidth={2.5} />
                          利用者情報
                        </button>
                      </div>

                      {/* Status Badge & Delete Button */}
                      <div className="mt-1 pt-2 flex justify-center items-center relative">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                          user.status === "共有済" 
                            ? "bg-[#F0F9EC] text-[#5A9E66] border-[#D1EAC8]" 
                            : "bg-blue-50 text-blue-500 border-blue-100"
                        }`}>
                          {user.status}
                        </span>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteModalOpen(true);
                            setMasterKeyInput("");
                            setDeleteError("");
                          }}
                          className="absolute right-0 text-red-300 hover:text-red-500 hover:bg-red-50 w-7 h-7 rounded-full flex items-center justify-center transition-all z-20"
                        >
                          <Trash2 size={15} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {hiddenUsers.length === 0 && (
                  <div className="w-full text-center text-gray-400 font-bold py-10">非表示の利用者は居ません</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] border-[4px] border-[#B5E4F2] p-6 relative shadow-2xl flex flex-col min-h-[460px] overflow-hidden">
            
            <div className="flex justify-between items-center mb-6">
              <div className="w-10"></div> 
              <h2 className="text-[20px] font-bold text-gray-800 tracking-wider">送迎場所</h2>
              <button 
                onClick={() => setSelectedUserId(null)}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex w-full mb-5 gap-3">
              <button 
                onClick={() => setLocationTab('pickup')}
                className={`flex-1 py-3 rounded-2xl text-[15px] transition-all font-bold ${
                  locationTab === 'pickup' 
                    ? 'bg-[#3DB2D3] text-white shadow-md' 
                    : 'bg-[#F2F7F7] text-gray-400 hover:text-gray-500 hover:bg-[#e4ecec]'
                }`}
              >
                お迎え
              </button>
              <button 
                onClick={() => setLocationTab('dropoff')}
                className={`flex-1 py-3 rounded-2xl text-[15px] transition-all font-bold ${
                  locationTab === 'dropoff' 
                    ? 'bg-[#3DB2D3] text-white shadow-md' 
                    : 'bg-[#F2F7F7] text-gray-400 hover:text-gray-500 hover:bg-[#e4ecec]'
                }`}
              >
                お送り
              </button>
            </div>

            <button 
              onClick={() => setIsInputModalOpen(true)}
              className="flex items-center gap-1.5 text-[#3DB2D3] font-bold text-[14px] hover:text-[#329ab8] transition-colors mb-2 w-fit px-2 py-1 rounded-lg hover:bg-[#EBF7FA] active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              {locationTab === 'pickup' ? 'お迎え先を登録' : 'お送り先を登録'}
            </button>

            <div className="flex-1 overflow-y-auto mb-10">
              <div className="flex flex-col">
                {activeLocations.map((loc, idx) => (
                  <div key={idx} className="flex justify-between items-center py-4 border-b border-dashed border-gray-400 group">
                    <div className="flex flex-col gap-1 pl-2">
                      <span className="text-[16px] font-bold text-gray-800 tracking-wide">{loc.name}</span>
                      <span className="text-[12px] text-gray-400 font-medium">住所：{loc.address}</span>
                    </div>
                    <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:bg-rose-50 hover:text-rose-500 transition-colors active:scale-95 mr-1">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <img 
              src="/usagi_3.png" 
              alt="usagi" 
              className="absolute bottom-0 right-12 w-24 object-contain pointer-events-none drop-shadow-sm" 
            />
          </div>
        </div>
      )}

      {/* Input Modal */}
      {isInputModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] border-[4px] border-[#B5E4F2] p-8 relative shadow-2xl flex flex-col">
            <h2 className="text-[20px] font-bold text-gray-800 mb-6 text-left tracking-wide">
              {locationTab === 'pickup' ? 'お迎え先登録' : 'お送り先登録'}
            </h2>
            <button 
              onClick={() => setIsInputModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            <div className="flex flex-col gap-6 mb-8">
              <div className="flex flex-col gap-2 relative">
                <label className="text-[14px] font-bold text-gray-700 flex items-center gap-2">
                  名称 <span className="bg-rose-100 text-rose-500 text-[10px] px-2 py-0.5 rounded-full">必須</span>
                </label>
                <input 
                  type="text" 
                  maxLength={15}
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-[#3DB2D3] focus:bg-white rounded-2xl px-4 py-3.5 text-gray-800 text-[15px] transition-all outline-none"
                  placeholder="例：家族送迎、自宅など"
                />
                <span className="absolute bottom-3.5 right-4 text-[12px] text-gray-400 font-bold bg-white/80 px-1 rounded">
                  {newLocationName.length}/15
                </span>
              </div>

              <div className="flex flex-col gap-2 relative">
                <label className="text-[14px] font-bold text-gray-700">
                  住所<span className="text-[12px] text-gray-400 ml-1">（任意）</span>
                </label>
                <input 
                  type="text" 
                  maxLength={50}
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-[#3DB2D3] focus:bg-white rounded-2xl px-4 py-3.5 text-gray-800 text-[15px] transition-all outline-none"
                  placeholder="例：未指定"
                />
                <span className="absolute bottom-3.5 right-4 text-[12px] text-gray-400 font-bold bg-white/80 px-1 rounded">
                  {newLocationAddress.length}/50
                </span>
              </div>
            </div>

            <button 
              onClick={handleRegisterClick}
              disabled={!newLocationName.trim()}
              className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] disabled:bg-gray-300 disabled:shadow-none text-white py-4 rounded-full font-bold text-[16px] shadow-md transition-all active:scale-[0.98] tracking-wide"
            >
              登録する
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[340px] rounded-[32px] border-[4px] border-[#B5E4F2] p-8 relative shadow-2xl flex flex-col items-center text-center">
            <img 
              src="/usagi_3.png" 
              alt="usagi" 
              className="w-24 object-contain drop-shadow-sm mb-4" 
            />
            <h2 className="text-[18px] font-bold text-gray-800 mb-8 tracking-wide">
              登録しますか？
            </h2>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setIsInputModalOpen(true);
                }}
                className="flex-1 py-3.5 rounded-full font-bold text-[15px] text-gray-500 bg-white border-2 border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
              >
                戻る
              </button>
              <button 
                onClick={handleConfirmRegister}
                className="flex-1 py-3.5 rounded-full font-bold text-[15px] text-white bg-[#3DB2D3] hover:bg-[#329ab8] shadow-[0_4px_12px_rgba(61,178,211,0.25)] active:scale-95 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {isUserInfoModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[480px] rounded-[32px] border-[4px] border-[#B5E4F2] p-8 relative shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-[20px] font-bold text-gray-800 tracking-wide">利用者情報</h2>
              <button 
                onClick={() => setIsUserInfoModalOpen(false)}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95 absolute top-6 right-6"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col gap-8 mb-10">
              <div className="flex items-center">
                <div className="w-[140px] text-[15px] font-bold text-gray-700 pl-2">お名前</div>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={userInfoName}
                    onChange={(e) => setUserInfoName(e.target.value)}
                    maxLength={10}
                    className="w-full bg-white border-2 border-gray-200 focus:border-[#3DB2D3] rounded-2xl px-4 py-3.5 text-gray-800 text-[15px] transition-all outline-none font-bold"
                  />
                  <div className="absolute -bottom-6 right-2 text-[12px] text-gray-400 font-bold">
                    {userInfoName.length}/10
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-[140px] text-[15px] font-bold text-gray-700 pl-2">利用日数</div>
                <div className="flex-1 flex items-center justify-center gap-6">
                  <button 
                    onClick={handleDecrementDays}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 font-bold text-xl hover:bg-gray-100 transition-colors active:scale-95"
                  >
                    <Minus size={22} strokeWidth={2.5} />
                  </button>
                  <div className="flex items-end justify-center min-w-[80px]">
                    <input 
                      type="number"
                      value={userInfoDays}
                      onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         setUserInfoDays(val);
                      }}
                      className="w-[45px] text-center text-[22px] font-bold text-gray-800 outline-none border-none focus:ring-0 bg-transparent p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[16px] font-bold text-gray-800 mb-1">日/月</span>
                  </div>
                  <button 
                    onClick={handleIncrementDays}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 font-bold text-xl hover:bg-gray-100 transition-colors active:scale-95"
                  >
                    <Plus size={22} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mt-4">
              {!isUserInfoRegistered ? (
                <button 
                  onClick={handleSaveUserInfo}
                  className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-4 rounded-full font-bold text-[16px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
                >
                  登録する
                </button>
              ) : (
                <button 
                  onClick={handleSaveUserInfo}
                  className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-4 rounded-full font-bold text-[16px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
                >
                  変更する
                </button>
              )}
              
              <button 
                onClick={handleRestoreUser}
                className="text-[#3DB2D3] hover:text-[#329ab8] text-[14px] font-bold transition-colors mt-1 active:scale-95"
              >
                表示に戻す
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[420px] rounded-[32px] border-[4px] border-[#B5E4F2] pt-6 pb-8 px-8 relative shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[18px] font-bold text-gray-800 tracking-wide">休日登録</h2>
              <button 
                onClick={() => setIsHolidayModalOpen(false)}
                className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors active:scale-95"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-4">
              <button 
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center text-[#3DB2D3] hover:bg-[#EBF7FA] rounded-full transition-colors"
              >
                <ChevronLeft size={20} strokeWidth={3} />
              </button>
              <div className="text-[20px] font-bold text-gray-800 tracking-wider">
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
              </div>
              <button 
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center text-[#3DB2D3] hover:bg-[#EBF7FA] rounded-full transition-colors border border-[#3DB2D3]"
              >
                <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                  <div key={day} className={`text-center py-2 text-[12px] font-bold border border-b-0 border-gray-200 ${i === 0 ? 'text-[#FF6B8B]' : 'text-gray-600'}`}>
                    {day}
                  </div>
                ))}
              </div>
              <div 
                key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                className="grid grid-cols-7 border-t-0 border-l border-gray-200"
              >
                {renderCalendarDays()}
              </div>
            </div>

            <div className="flex justify-end mb-6">
              <button 
                onClick={() => setIsDayOfWeekModalOpen(true)}
                className="flex items-center gap-1.5 cursor-pointer text-[#3DB2D3] font-bold text-[13px] hover:text-[#329ab8] border border-[#3DB2D3] rounded-md px-2 py-1 transition-colors active:scale-95 bg-white"
              >
                <CheckSquare size={14} strokeWidth={2.5} />
                曜日で選択する
              </button>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => setIsHolidayModalOpen(false)}
                className="w-full bg-[#B3B3B3] hover:bg-gray-400 text-white py-3.5 rounded-full font-bold text-[15px] shadow-sm transition-all active:scale-[0.98] tracking-wide"
              >
                登録する
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Day of Week Modal */}
      {isDayOfWeekModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[120] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[380px] rounded-[32px] border-[4px] border-[#B5E4F2] p-8 relative shadow-2xl flex flex-col">
            <h2 className="text-[18px] font-bold text-gray-800 mb-6 tracking-wide">曜日で一括選択</h2>
            <button 
              onClick={() => setIsDayOfWeekModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors active:scale-95"
            >
              <X size={16} strokeWidth={3} />
            </button>

            <div className="flex flex-col items-center gap-4 mb-8">
              {['日', '月', '火', '水', '木', '金', '土', '祝日'].map((day, i) => {
                const indexValue = i === 7 ? 7 : i;
                const isChecked = selectedDaysOfWeek.includes(indexValue);
                return (
                  <div 
                    key={indexValue} 
                    onClick={() => toggleDayOfWeek(indexValue)}
                    className="flex items-center gap-3 cursor-pointer group w-[100px] justify-start"
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                      isChecked ? 'bg-[#FF6B8B] border-[#FF6B8B]' : 'bg-white border-gray-300 group-hover:border-[#FF6B8B]'
                    }`}>
                      {isChecked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-[15px] font-bold ${
                      indexValue === 7 || i === 0 ? 'text-[#FF6B8B]' : i === 6 ? 'text-[#3DB2D3]' : 'text-gray-700'
                    }`}>
                      {indexValue === 7 ? day : `${day}曜日`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-3 w-full">
              <button 
                onClick={handleRemoveDaysOfWeek}
                disabled={selectedDaysOfWeek.length === 0}
                className="flex-1 bg-white border-2 border-[#FF6B8B] text-[#FF6B8B] hover:bg-[#FFF0F3] disabled:border-gray-200 disabled:text-gray-300 disabled:bg-gray-50 py-3.5 rounded-full font-bold text-[14px] transition-all active:scale-[0.98] tracking-wide"
              >
                一括解除
              </button>
              <button 
                onClick={handleApplyDaysOfWeek}
                disabled={selectedDaysOfWeek.length === 0}
                className="flex-1 bg-[#3DB2D3] hover:bg-[#329ab8] text-white disabled:bg-gray-300 disabled:shadow-none py-3.5 rounded-full font-bold text-[14px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
              >
                適用する
              </button>
            </div>
          </div>
        </div>
      )}
      
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
      {/* Complete Delete Master Key Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] border-[4px] border-rose-200 p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
              }}
              className="absolute top-5 right-5 w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mb-5 mt-2 border-2 border-rose-200 text-rose-500">
              <TriangleAlert size={26} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-bold text-gray-800 mb-2 leading-relaxed tracking-wide">
              完全削除の確認
            </h2>
            <p className="text-[14px] text-gray-500 font-medium mb-6">
              利用者「{userToDelete.name}」さんのデータを完全に削除しますか？この操作は取り消せません。
            </p>
            
            <div className="w-full mb-6">
              <input
                type="text"
                maxLength={6}
                value={masterKeyInput}
                onChange={(e) => setMasterKeyInput(e.target.value)}
                placeholder="マスターキー"
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-rose-300 focus:bg-white rounded-xl px-4 py-3.5 text-[20px] font-bold text-gray-800 outline-none text-center tracking-[0.2em] transition-all"
              />
              {deleteError && (
                <p className="text-rose-500 text-[13px] font-bold mt-2 animate-in slide-in-from-top-1">
                  {deleteError}
                </p>
              )}
            </div>

            <div className="flex w-full gap-3">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3.5 rounded-full font-bold text-[15px] transition-all"
              >
                キャンセル
              </button>
              <button 
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser || !masterKeyInput}
                className="flex-1 bg-[#FF6B8B] hover:bg-[#f1597a] text-white disabled:bg-gray-300 disabled:shadow-none py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(255,107,139,0.25)] transition-all flex items-center justify-center"
              >
                {isDeletingUser ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Auth Modal */}
      {isAdminAuthModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] border-[4px] border-[#2B4C5E]/20 p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => {
                setIsAdminAuthModalOpen(false);
                setAdminMasterKeyInput("");
                setAdminAuthError("");
              }}
              className="absolute top-5 right-5 w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="w-14 h-14 bg-[#2B4C5E]/10 rounded-full flex items-center justify-center mb-5 mt-2 border-2 border-[#2B4C5E]/20 text-[#2B4C5E]">
              <Lock size={26} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-bold text-gray-800 mb-2 leading-relaxed tracking-wide">
              管理者認証
            </h2>
            <p className="text-[14px] text-gray-500 font-medium mb-6">
              管理者メニューを開くにはマスターキーを入力してください。
            </p>
            
            <div className="w-full mb-6">
              <input
                type="password"
                maxLength={6}
                value={adminMasterKeyInput}
                onChange={(e) => setAdminMasterKeyInput(e.target.value)}
                placeholder="マスターキー"
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#2B4C5E]/40 focus:bg-white rounded-xl px-4 py-3.5 text-[20px] font-bold text-gray-800 outline-none text-center tracking-[0.2em] transition-all"
              />
              {adminAuthError && (
                <p className="text-rose-500 text-[13px] font-bold mt-2 animate-in slide-in-from-top-1">
                  {adminAuthError}
                </p>
              )}
            </div>

            <div className="flex w-full gap-3">
              <button 
                onClick={() => {
                  if (adminMasterKeyInput === "asf215") {
                    setIsMasterAuthenticated(true);
                    setIsAdminAuthModalOpen(false);
                    setAdminMasterKeyInput("");
                    setAdminAuthError("");
                  } else {
                    setAdminAuthError("※マスターキーが間違っています");
                  }
                }}
                disabled={!adminMasterKeyInput}
                className="w-full bg-[#2B4C5E] hover:bg-[#1E3A49] text-white disabled:bg-gray-300 disabled:shadow-none py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(43,76,94,0.3)] transition-all flex items-center justify-center"
              >
                認証する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Facility Modal */}
      {isDeleteFacilityModalOpen && facilityToDelete && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] border-[4px] border-[#FF6B8B]/20 p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => {
                setIsDeleteFacilityModalOpen(false);
                setFacilityToDelete(null);
              }}
              className="absolute top-5 right-5 w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="w-14 h-14 bg-[#FFF0F3] rounded-full flex items-center justify-center mb-5 mt-2 border-2 border-[#FF6B8B]/20 text-[#FF6B8B]">
              <TriangleAlert size={26} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-bold text-gray-800 mb-2 leading-relaxed tracking-wide">
              施設の削除確認
            </h2>
            <p className="text-[14px] text-gray-500 font-medium mb-6">
              施設「{facilityToDelete.name}」を本当に削除しますか？内のデータもすべて削除されます。<br />この操作は取り消せません。
            </p>

            <div className="flex w-full gap-3">
              <button 
                onClick={() => {
                  setIsDeleteFacilityModalOpen(false);
                  setFacilityToDelete(null);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3.5 rounded-full font-bold text-[15px] transition-all"
              >
                キャンセル
              </button>
              <button 
                onClick={async () => {
                  setIsDeletingFacility(true);
                  try {
                    // Delete all children in the facility
                    const q = query(collection(db, "children"), where("facilityId", "==", facilityToDelete.id));
                    const snap = await getDocs(q);
                    for (const d of snap.docs) {
                       const bookingsSnap = await getDocs(collection(db, "children", d.id, "bookings"));
                       for (const b of bookingsSnap.docs) {
                         await deleteDoc(doc(db, "children", d.id, "bookings", b.id));
                       }
                       await deleteDoc(doc(db, "children", d.id));
                    }
                    // Delete facility doc
                    await deleteDoc(doc(db, "facilities", facilityToDelete.id));
                    
                    setShowToast({ message: "施設を削除しました", visible: true });
                    setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
                  } catch(e) {
                    console.error(e);
                  } finally {
                    setIsDeletingFacility(false);
                    setIsDeleteFacilityModalOpen(false);
                    setFacilityToDelete(null);
                  }
                }}
                disabled={isDeletingFacility}
                className="flex-1 bg-[#FF6B8B] hover:bg-[#f1597a] text-white disabled:bg-gray-300 disabled:shadow-none py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(255,107,139,0.25)] transition-all flex items-center justify-center"
              >
                {isDeletingFacility ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
