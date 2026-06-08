"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon,
  MoreVertical,
  CheckCircle2,
  Menu,
  User,
  Trash2,
  MapPin as MapPinIcon,
  Pencil,
  Copy,
  Users,
  ChevronDown,
  Book,
  AlertTriangle,
  Bell
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import * as JapaneseHolidays from "japanese-holidays";
import usagiIcon from "../../public/usagi_icon.png";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, documentId, getDocs } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { app, db } from "@/lib/firebase";

// FAMILY_MEMBERS was removed in favor of dynamic fetching

// Dummy reservation data
const getDummyReservations = () => {
  const today = new Date();
  return [
    {
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), // 2 days later
      pickup: { time: "15:30", place: "〇〇小" },
      dropoff: { time: "17:30", place: "自宅" },
      status: "confirmed",
      userId: 901,
      facilityId: "facility-1774355827269"
    },
    {
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4), // 4 days later
      pickup: { time: "15:30", place: "〇〇小" },
      dropoff: { time: "17:30", place: "自宅" },
      status: "unconfirmed",
      userId: 901,
    }
  ];
};

const DUMMY_RESERVATIONS = getDummyReservations();

function HomeContent() {
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);

  const [activeUser, setActiveUser] = useState<{id: string|number, name: string} | null>(null);
  const [familyMembers, setFamilyMembers] = useState<{id: string|number, name: string}[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const initializeData = async () => {
      // 1. URLパラメータの取得
      const urlChildId = searchParams.get('childId');
      const urlLinkedIdsStr = searchParams.get('linkedIds');
      
      let targetIds: string[] = [];
      if (urlLinkedIdsStr) {
        targetIds = urlLinkedIdsStr.split(',').filter(Boolean);
      } else {
        const stored = localStorage.getItem('pico_yoyaku_linked_ids');
        if (stored) {
          try { targetIds = JSON.parse(stored); } catch(e){}
        }
      }

      // 【修正1】urlChildIdが渡されている場合、確実にFirestoreの取得対象(targetIds)に含めるガード
      if (urlChildId && !targetIds.includes(urlChildId)) {
        targetIds.push(urlChildId);
      }
      
      let initialChildId = urlChildId || localStorage.getItem('pico_active_user') || targetIds[0];
      
      if (targetIds.length > 0) {
        try {
          const auth = getAuth(app);
          await signInAnonymously(auth);
          
          const q = query(collection(db, "children"), where(documentId(), "in", targetIds));
          const snap = await getDocs(q);
          const members = snap.docs.map(d => ({
            id: d.id,
            name: d.data().name || "名称未設定"
          }));
          
          if (members.length > 0) {
            setFamilyMembers(members);
            localStorage.setItem('pico_yoyaku_linked_ids', JSON.stringify(targetIds));
            
            // 【修正2】フライング伝播を防止するための厳密な条件分岐
            let targetUser;
            if (urlChildId) {
              // URLから指定がある場合は他のお子様(members[0])へのフォールバックを絶対に行わない
              targetUser = members.find(m => String(m.id) === String(urlChildId));
            } else {
              // URLからの指定がない通常アクセス時は、既存のローカルストレージ復旧ロジックを維持
              targetUser = members.find(m => String(m.id) === String(initialChildId)) || members[0];
            }
            
            // 確実に対象データが取得できた時のみ activeUser にセット（読み込み完了）
            if (targetUser) {
              setActiveUser(targetUser);
              localStorage.setItem('pico_active_user', targetUser.id.toString());
            }
          }
        } catch (e) {
          console.error("Failed to fetch family members:", e);
        }
      } else {
        // パラメーターがなく、ローカルストレージにも履歴がない場合の安全ガード
        setIsAuthError(true);
      }
    };
    
    initializeData();
  }, [searchParams]);

  // モックのユーザー・施設情報（将来的にはPropsやContextから取得する）
  // 施設側で選択中の施設と確実に連携できるよう、localStorageから取得
  const [currentFacilityId, setCurrentFacilityId] = useState("facility-1774355827269");

  useEffect(() => {
    const storedFacility = localStorage.getItem('pico_selected_facility');
    const FACILITY_MAP: Record<string, string> = {
      "葭津": "facility-1773884904073",
      "渡": "facility-1773884917420",
      "大篠津": "facility-1773884944675",
      "湯梨浜": "facility-1773884954458",
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

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'new' | 'edit'>('new');
  
  const [reservations, setReservations] = useState(DUMMY_RESERVATIONS);
  
  const [pickupLocations, setPickupLocations] = useState(["〇〇小", "自宅", "家族送り"]);
  const [dropoffLocations, setDropoffLocations] = useState(["自宅", "家族迎え", "祖母宅"]);
  const [fullLocations, setFullLocations] = useState<{pickup: any[], dropoff: any[]}>({pickup: [], dropoff: []});

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [memos, setMemos] = useState<Record<string, { text: string, userId: string, facilityId: string }>>({});
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [memoInput, setMemoInput] = useState("");
  const [facilityHolidays, setFacilityHolidays] = useState<{ specificDates: string[], regularDays: number[] }>({ specificDates: [], regularDays: [] });
  const [reservationDeadline, setReservationDeadline] = useState<number>(3);
  const [isDeadlineAlertOpen, setIsDeadlineAlertOpen] = useState(false);
  const [showToast, setShowToast] = useState<{message: string, visible: boolean}>({message: "", visible: false});
  const [maxDaysPerMonth, setMaxDaysPerMonth] = useState<number>(999);
  const [isLimitAlertOpen, setIsLimitAlertOpen] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);

  // お知らせ用のステート
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Old activeUser effect removed

  useEffect(() => {
    let unsubBookings = () => {};
    let unsubUser = () => {};
    if (!activeUser?.id) return;
    try {
        unsubUser = onSnapshot(doc(db, "children", activeUser.id.toString()), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const pick = Array.isArray(data.pickupLocation) ? data.pickupLocation : [];
            const drop = Array.isArray(data.dropoffLocation) ? data.dropoffLocation : [];
            setFullLocations({ pickup: pick, dropoff: drop });
            setPickupLocations(pick.map((l: any) => l.name || l));
            setDropoffLocations(drop.map((l: any) => l.name || l));
            
            const mDays = typeof data.days === 'number' ? data.days : parseInt(data.days, 10);
            setMaxDaysPerMonth(isNaN(mDays) ? 999 : mDays);
          } else {
            setFullLocations({ pickup: [], dropoff: [] });
            setPickupLocations([]);
            setDropoffLocations([]);
          }
        });

      const storedMemos = localStorage.getItem(`pico_parent_memos_${activeUser.id}`);
      if (storedMemos) {
        const parsedMemos = JSON.parse(storedMemos);
        if (parsedMemos && typeof parsedMemos === 'object') {
          setMemos(parsedMemos);
        }
      } else {
        setMemos({});
      }
      
      const storedHolidays = localStorage.getItem("pico_facility_holidays");
      if (storedHolidays) {
        setFacilityHolidays(JSON.parse(storedHolidays));
      }

      const storedDeadline = localStorage.getItem("pico_reservation_deadline");
      if (storedDeadline) {
        setReservationDeadline(parseInt(storedDeadline, 10));
      }
    } catch (e) {
      console.error("Failed to parse localStorage data", e);
    }
    setIsInitialized(true);
    
    return () => { unsubUser(); };
  }, [activeUser?.id]);

  useEffect(() => {
    let unsubBookings = () => {};
    if (activeUser?.id) {
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const startDateStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
      
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0); 
      const endDateStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`;

      const q = query(
        collection(db, "children", activeUser.id.toString(), "bookings"),
        where("date", ">=", startDateStr),
        where("date", "<=", endDateStr)
      );

      unsubBookings = onSnapshot(q, (snap) => {
        const fetched = snap.docs.map(docSnap => {
          const data = docSnap.data();
          let bDate;
          if (data.date && typeof data.date.toDate === 'function') {
            bDate = data.date.toDate();
          } else if (typeof data.date === 'string' && data.date.includes('-')) {
            const [y, m, d] = data.date.split('T')[0].split('-');
            bDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
          } else {
            bDate = new Date(data.date);
          }
          return { ...data, date: bDate };
        });
        setReservations(fetched as any);
      });
    }
    return () => { unsubBookings(); };
  }, [activeUser?.id, currentDate]);

  useEffect(() => {
    const handleDeadlineUpdate = () => {
      const storedDeadline = localStorage.getItem("pico_reservation_deadline");
      if (storedDeadline) {
        setReservationDeadline(parseInt(storedDeadline, 10));
      }
    };
    window.addEventListener("pico_reservation_deadline_updated", handleDeadlineUpdate);
    return () => {
      window.removeEventListener("pico_reservation_deadline_updated", handleDeadlineUpdate);
    };
  }, []);

  // Removed location saving logic as parent now only reads from facility data

  useEffect(() => {
    if (isInitialized && activeUser?.id) {
      localStorage.setItem(`pico_parent_memos_${activeUser.id}`, JSON.stringify(memos));
    }
  }, [memos, activeUser?.id, isInitialized]);

  // お知らせのフェッチと未読計算
  useEffect(() => {
    if (!isInitialized || !activeUser?.id) return;
    
    const q = query(collection(db, "announcements"), where("facilityId", "==", currentFacilityId));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => {
        const data = doc.data();
        let datetimeStr = "たった今";
        let rawTime = Date.now();
        if (data.createdAt?.toDate) {
           const d = data.createdAt.toDate();
           datetimeStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
           rawTime = data.createdAt.toMillis();
        } else if (data.createdAt?.toMillis) {
           rawTime = data.createdAt.toMillis();
        }
        return {
          id: doc.id,
          datetime: datetimeStr,
          content: data.text,
          targetType: data.targetType,
          targetUserIds: data.targetUserIds || [],
          _time: rawTime
        };
      });
      
      // 自分宛て（全体 or 自分を含む）のみ抽出
      const myAnnouncements = items.filter(item => 
        item.targetType === 'all' || item.targetUserIds.includes(activeUser.id.toString())
      );
      
      myAnnouncements.sort((a, b) => b._time - a._time);
      setAnnouncements(myAnnouncements);
      
      // 未読計算
      const lastReadStr = localStorage.getItem(`pico_last_read_announcements_${activeUser.id}`);
      const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;
      const unread = myAnnouncements.filter(item => item._time > lastRead).length;
      setUnreadCount(unread);
    });
    
    return () => unsub();
  }, [activeUser?.id, currentFacilityId, isInitialized]);
  
  const [newPickupLoc, setNewPickupLoc] = useState("");
  const [newDropoffLoc, setNewDropoffLoc] = useState("");

  // --- Location Management Modal State ---
  const [locationTab, setLocationTab] = useState<'pickup' | 'dropoff'>('pickup');
  const [isSubLocationModalOpen, setIsSubLocationModalOpen] = useState(false);
  const [subLocationForm, setSubLocationForm] = useState({ name: '', address: '' });
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);


  // --- Copy Modal State ---
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySelectedDates, setCopySelectedDates] = useState<Date[]>([]);
  const [copyCalendarDate, setCopyCalendarDate] = useState(new Date());

  const [formData, setFormData] = useState({
    pickupTime: "15:30",
    pickupPlace: "〇〇小学校前",
    isPickupTimeUndecided: false,
    dropoffTime: "17:30",
    dropoffPlace: "自宅",
    isDropoffTimeUndecided: false
  });
  const [isPickupDropdownOpen, setIsPickupDropdownOpen] = useState(false);
  const [isDropoffDropdownOpen, setIsDropoffDropdownOpen] = useState(false);
  const [isPickupTimeDropdownOpen, setIsPickupTimeDropdownOpen] = useState(false);
  const [isDropoffTimeDropdownOpen, setIsDropoffTimeDropdownOpen] = useState(false);

  const pickupTimeSelectedRef = useRef<HTMLButtonElement>(null);
  const dropoffTimeSelectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isPickupTimeDropdownOpen && pickupTimeSelectedRef.current) {
      setTimeout(() => {
        pickupTimeSelectedRef.current?.scrollIntoView({ block: 'center' });
      }, 0);
    }
  }, [isPickupTimeDropdownOpen]);

  useEffect(() => {
    if (isDropoffTimeDropdownOpen && dropoffTimeSelectedRef.current) {
      setTimeout(() => {
        dropoffTimeSelectedRef.current?.scrollIntoView({ block: 'center' });
      }, 0);
    }
  }, [isDropoffTimeDropdownOpen]);

  const timeOptions = useMemo(() => {
    const options = [];
    for (let h = 8; h <= 18; h++) {
      for (let m = 0; m < 60; m += 5) {
        if (h === 18 && m > 30) break;
        options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return options;
  }, []);

  const syncLocationsToStorage = async (type: 'pickup' | 'dropoff', action: 'add' | 'edit' | 'delete', idx: number | null, newName: string, newAddress: string = '未指定') => {
    if (!activeUser) return;
    try {
      const arr = type === 'pickup' ? [...fullLocations.pickup] : [...fullLocations.dropoff];
      
      if (action === 'add') {
        arr.push({ id: Date.now().toString(), name: newName, address: newAddress || "未指定" });
      } else if (action === 'edit' && idx !== null) {
        if (arr[idx]) {
          arr[idx].name = newName;
          arr[idx].address = newAddress || "未指定";
        }
      } else if (action === 'delete' && idx !== null) {
        arr.splice(idx, 1);
      }
      
      const docRef = doc(db, "children", activeUser.id.toString());
      const updateField = type === 'pickup' ? "pickupLocation" : "dropoffLocation";
      await setDoc(docRef, { [updateField]: arr }, { merge: true });
    } catch(e) {
      console.error(e);
    }
  };

  const deletePickupLocation = (idx: number) => {
    const deletedVal = pickupLocations[idx];
    const updated = pickupLocations.filter((_, i) => i !== idx);
    setPickupLocations(updated);
    syncLocationsToStorage('pickup', 'delete', idx, "", "");
    
    if (formData.pickupPlace === deletedVal) {
      setFormData(prev => ({ ...prev, pickupPlace: updated[0] || "" }));
    }
  };

  const deleteDropoffLocation = (idx: number) => {
    const deletedVal = dropoffLocations[idx];
    const updated = dropoffLocations.filter((_, i) => i !== idx);
    setDropoffLocations(updated);
    syncLocationsToStorage('dropoff', 'delete', idx, "", "");
    
    if (formData.dropoffPlace === deletedVal) {
      setFormData(prev => ({ ...prev, dropoffPlace: updated[0] || "" }));
    }
  };

  // --- Calendar Logic ---
  const isFacilityHoliday = (d: Date) => {
    const dayOfWeek = d.getDay();
    const isNationalHoliday = JapaneseHolidays.isHoliday(d);
    
    // Parse saved YYYY-MM-DD strings and compare numeric components for exact matching
    const isSpecificDate = facilityHolidays.specificDates.some(savedDate => {
      const [y, m, dNum] = savedDate.split('-');
      return parseInt(y, 10) === d.getFullYear() && 
             parseInt(m, 10) === d.getMonth() + 1 && 
             parseInt(dNum, 10) === d.getDate();
    });

    return isSpecificDate || facilityHolidays.regularDays.includes(dayOfWeek) || (facilityHolidays.regularDays.includes(7) && Boolean(isNationalHoliday));
  };

  const calculateDeadlineDate = (targetDate: Date, deadlineDays: number): Date => {
    let current = new Date(targetDate);
    let businessDaysCount = 1;
    
    while (businessDaysCount < deadlineDays) {
      current.setDate(current.getDate() - 1);
      if (!isFacilityHoliday(current)) {
        businessDaysCount++;
      }
    }
    current.setHours(23, 59, 59, 999);
    return current;
  };

  const isPastDeadline = (targetDate: Date) => {
    const deadline = calculateDeadlineDate(targetDate, reservationDeadline);
    return new Date() > deadline;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Find reservation for selected date
  const selectedReservation = reservations.find(res => isSameDay(res.date, selectedDate));

  const addHistoryWithAggregation = (history: any[], newDate: Date, actionType: 'create' | 'edit' | 'delete', bulkCount: number = 1) => {
    if (!activeUser) return;
    const now = new Date();
    const targetMonthStr = format(newDate, 'yyyy-MM');
    const newTimestamp = now.toISOString();

    if (actionType === 'create') {
      const lastHistory = history[0];
      if (lastHistory) {
        const lastTime = new Date(lastHistory.timestamp).getTime();
        const diffMinutes = (now.getTime() - lastTime) / (1000 * 60);

        if (
          lastHistory.userId === activeUser.id &&
          (lastHistory.action === 'create' || lastHistory.action === 'create_bulk') &&
          lastHistory.targetMonth === targetMonthStr &&
          diffMinutes <= 15 &&
          lastHistory.status === '未確認'
        ) {
          // Merge
          const newCount = (lastHistory.count || 1) + bulkCount;
          lastHistory.count = newCount;
          lastHistory.timestamp = newTimestamp;
          lastHistory.action = 'create';
          if (newCount >= 2) {
            lastHistory.message = `${activeUser.name}さんが${format(newDate, 'M月')}のカレンダーに${newCount}件の新規予約をしました`;
          } else {
            lastHistory.message = `${activeUser.name}さんが${format(newDate, 'M月d日(E)', { locale: ja })}に新規予約をしました`;
          }
          return;
        }
      }
    }

    // Otherwise, push new
    let message = "";
    if (actionType === 'create') {
      if (bulkCount >= 2) {
        message = `${activeUser.name}さんが${format(newDate, 'M月')}のカレンダーに${bulkCount}件の新規予約をしました`;
      } else {
        message = `${activeUser.name}さんが${format(newDate, 'M月d日(E)', { locale: ja })}に新規予約をしました`;
      }
    } else if (actionType === 'edit') {
      message = `${activeUser.name}さんが${format(newDate, 'M月d日(E)', { locale: ja })}の予約を変更しました`;
    } else if (actionType === 'delete') {
      message = `${activeUser.name}さんが${format(newDate, 'M月d日(E)', { locale: ja })}の予約を削除しました`;
    }

    history.unshift({
      id: Math.random().toString(36).substring(2, 9),
      action: actionType,
      message,
      timestamp: newTimestamp,
      status: '未確認',
      userId: activeUser.id,
      targetMonth: targetMonthStr,
      count: bulkCount
    });
  };

  const handleSave = async () => {
    if (!activeUser) return;
    if (modalMode === 'new') {
      const existingIdx = reservations.findIndex(r => isSameDay(r.date, selectedDate));
      if (existingIdx === -1) {
        const currentCount = reservations.filter(r => isSameMonth(r.date, selectedDate)).length;
        if (currentCount >= maxDaysPerMonth) {
          setIsLimitAlertOpen(true);
          return;
        }
      }
    }
    
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const newRes = {
      date: dateStr,
      pickup: { time: formData.isPickupTimeUndecided ? "未定" : formData.pickupTime, place: formData.pickupPlace },
      dropoff: { time: formData.isDropoffTimeUndecided ? "未定" : formData.dropoffTime, place: formData.dropoffPlace },
      status: "unconfirmed",
      userId: activeUser.id.toString(),
      facilityId: currentFacilityId
    };
    
    const docRef = doc(db, "children", activeUser.id.toString(), "bookings", dateStr);
    await setDoc(docRef, newRes);
    
    if (isToday(selectedDate)) {
      const childDocRef = doc(db, "children", activeUser.id.toString());
      await setDoc(childDocRef, {
        isTodayActive: true,
        lastAttendanceDate: format(new Date(), 'yyyy-MM-dd')
      }, { merge: true });
    }

    if (modalMode === 'edit') {
      if (selectedReservation?.status === 'confirmed') {
        try {
          const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
          addHistoryWithAggregation(history, selectedDate, 'edit');
          localStorage.setItem('pico_change_history', JSON.stringify(history));
        } catch (e) {}
      }
    } else {
      try {
        const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
        addHistoryWithAggregation(history, selectedDate, 'create');
        localStorage.setItem('pico_change_history', JSON.stringify(history));
      } catch (e) {}
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!activeUser) return;
    if (window.confirm("本当に削除しますか？")) {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      const docRef = doc(db, "children", activeUser.id.toString(), "bookings", dateStr);
      await deleteDoc(docRef);
      setIsModalOpen(false);

      if (isToday(selectedDate)) {
        const childDocRef = doc(db, "children", activeUser.id.toString());
        await setDoc(childDocRef, {
          isTodayActive: false
        }, { merge: true });
      }

      if (selectedReservation?.status === 'confirmed') {
        try {
          const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
          addHistoryWithAggregation(history, selectedDate, 'delete');
          localStorage.setItem('pico_change_history', JSON.stringify(history));
        } catch (e) {}
      }
    }
  };

  // --- Bulk Copy Logic ---
  const copyMonthStart = startOfMonth(copyCalendarDate);
  const copyMonthEnd = endOfMonth(copyMonthStart);
  const copyStartDate = startOfWeek(copyMonthStart, { weekStartsOn: 0 }); // Sunday start
  const copyEndDate = endOfWeek(copyMonthEnd, { weekStartsOn: 0 });
  const copyCalendarDays = eachDayOfInterval({ start: copyStartDate, end: copyEndDate });

  const nextCopyMonth = () => setCopyCalendarDate(addMonths(copyCalendarDate, 1));
  const prevCopyMonth = () => setCopyCalendarDate(subMonths(copyCalendarDate, 1));

  // Toggle day of week (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)
  const toggleDayOfWeek = (dayOfWeek: number) => {
    // Determine the range to apply (current month only)
    const startRange = startOfMonth(copyCalendarDate);
    const endRange = endOfMonth(copyCalendarDate);
    const rangeDays = eachDayOfInterval({ start: startRange, end: endRange });
    
    const targetDays = rangeDays.filter(d => d.getDay() === dayOfWeek);
    
    const areAllSelected = targetDays.length > 0 && targetDays.every(td => 
      copySelectedDates.some(selected => isSameDay(selected, td))
    );

    if (areAllSelected) {
      // Remove them
      setCopySelectedDates(prev => prev.filter(p => !targetDays.some(td => isSameDay(p, td))));
    } else {
      // Add them
      setCopySelectedDates(prev => {
        const newDates = [...prev];
        targetDays.forEach(td => {
          if (!newDates.some(selected => isSameDay(selected, td))) {
            newDates.push(td);
          }
        });
        return newDates;
      });
    }
  };

  const toggleCopyDate = (date: Date) => {
    setCopySelectedDates(prev => {
      const exists = prev.some(d => isSameDay(d, date));
      if (exists) {
        return prev.filter(d => !isSameDay(d, date));
      } else {
        return [...prev, date];
      }
    });
  };

  const handleBulkCopySave = async () => {
    if (!activeUser) return;
    const datesToSave = [selectedDate, ...copySelectedDates.filter(d => !isSameDay(d, selectedDate))];
    
    const monthsToCheck = Array.from(new Set(datesToSave.map(d => format(d, 'yyyy-MM'))));
    for (const monthStr of monthsToCheck) {
      const existingInMonth = reservations.filter(r => format(r.date, 'yyyy-MM') === monthStr);
      const savingInMonth = datesToSave.filter(d => format(d, 'yyyy-MM') === monthStr);
      const newDatesCount = savingInMonth.filter(d => !existingInMonth.some(r => isSameDay(r.date, d))).length;
      if (existingInMonth.length + newDatesCount > maxDaysPerMonth) {
        setIsLimitAlertOpen(true);
        return;
      }
    }
    
    for (const d of datesToSave) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const newRes = {
        date: dateStr,
        pickup: { time: formData.isPickupTimeUndecided ? "未定" : formData.pickupTime, place: formData.pickupPlace },
        dropoff: { time: formData.isDropoffTimeUndecided ? "未定" : formData.dropoffTime, place: formData.dropoffPlace },
        status: "unconfirmed",
        userId: activeUser.id.toString(),
        facilityId: currentFacilityId
      };
      const docRef = doc(db, "children", activeUser.id.toString(), "bookings", dateStr);
      await setDoc(docRef, newRes);

      if (isToday(d)) {
        const childDocRef = doc(db, "children", activeUser.id.toString());
        await setDoc(childDocRef, {
          isTodayActive: true,
          lastAttendanceDate: format(new Date(), 'yyyy-MM-dd')
        }, { merge: true });
      }
    }

    setIsCopyModalOpen(false);
    setIsModalOpen(false);
    
    try {
      const history = JSON.parse(localStorage.getItem('pico_change_history') || '[]');
      datesToSave.forEach(date => {
        addHistoryWithAggregation(history, date, 'create', 1);
      });
      localStorage.setItem('pico_change_history', JSON.stringify(history));
    } catch (e) {}
  };

  if (isAuthError) {
    return (
      <div className="flex justify-center min-h-screen bg-zinc-100">
        <div className="w-full max-w-[420px] bg-[#A1DDF0] min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg w-full max-w-sm">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-700 font-bold mb-2">パラメーターエラー</p>
            <p className="text-gray-500 text-sm">Pico！連絡帳から再度アクセスしてください。</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isClient || !activeUser) {
    return <div className="flex justify-center min-h-screen bg-zinc-100"><div className="w-full max-w-[420px] bg-[#A1DDF0] min-h-screen" /></div>;
  }

  return (
    <div className="flex justify-center min-h-screen bg-zinc-100">
      {/* Mobile Device Container */}
      <div className="w-full max-w-[420px] bg-[#A1DDF0] min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Section (Outside App Frame) */}
        <div className="bg-[#A1DDF0] pt-6 pb-5 px-6 flex items-center justify-center relative">
          
          <a
            href="https://example.com/pico-contact"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-5 bottom-3 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 rounded-full transition-colors z-20 shadow-sm"
          >
            <Book size={16} className="text-[#76D7A8]" />
            <span className="text-[13px] font-bold">連絡帳</span>
          </a>

          <h1 className="text-xl font-bold text-white tracking-wide flex items-baseline gap-1 relative z-10">
            {activeUser.name} <span className="text-sm font-medium text-white/90">さん</span>
          </h1>
          
          {/* ファミリー切り替え（人マーク） */}
          {familyMembers.length > 1 && (
            <div className="absolute right-5 bottom-3 z-20">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors shadow-sm"
              >
                <User size={18} />
              </button>
              
              {/* User Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute right-0 top-11 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-100 z-40 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">

                    {familyMembers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setActiveUser(user);
                          localStorage.setItem('pico_active_user', user.id.toString());
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-[14px] font-bold flex items-center gap-3 transition-colors ${
                          activeUser.id === user.id ? 'bg-[#EAF5F5] text-[#3DB2D3]' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeUser.id === user.id ? 'bg-[#3DB2D3]' : 'bg-gray-200'}`}></div>
                        {user.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          <img 
            src={usagiIcon.src} 
            alt="うさぎ" 
            style={{
              position: 'absolute',
              right: '65px',
              bottom: '0px',
              height: '40px',
              width: 'auto'
            }}
          />
        </div>

        {/* Main App Area */}
        <div className="flex-1 bg-white rounded-t-[32px] shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden relative">
          
          {/* App Header (mocking the app top bar) */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
             <div className="relative">
               <button 
                 onClick={() => setIsMenuOpen(!isMenuOpen)}
                 className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
               >
                 <Menu size={24} />
               </button>
               
               {isMenuOpen && (
                 <>
                   <div 
                     className="fixed inset-0 z-40" 
                     onClick={() => setIsMenuOpen(false)}
                   />
                   <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 z-50 overflow-hidden py-2">
                     <button 
                       onClick={() => {
                         setIsLocationModalOpen(true);
                         setIsMenuOpen(false);
                       }}
                       className="w-full text-left px-5 py-4 text-[15px] font-bold text-[#334155] hover:bg-[#EAF5F5] transition-colors active:bg-gray-50 flex items-center gap-2"
                     >
                       <MapPinIcon size={18} className="text-[#3DB2D3]" />
                       送迎場所の登録
                     </button>
                   </div>
                 </>
               )}
             </div>
             <div className="font-bold text-[19px] tracking-[0.08em] flex items-center gap-2 text-[#4B5563]">
                <img src="/pick_icon.png" alt="car icon" className="w-[22px] h-[22px] object-contain brightness-95 contrast-110" />
                <span>利用予約</span>
             </div>
             <div className="relative z-20">
               <button 
                 onClick={() => {
                   setIsNotificationsOpen(true);
                   localStorage.setItem(`pico_last_read_announcements_${activeUser.id}`, Date.now().toString());
                   setUnreadCount(0);
                 }}
                 className="relative w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
               >
                 <Bell size={16} />
                 {unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#FF6B8B] rounded-full border-2 border-white"></span>
                 )}
               </button>
             </div>
          </div>

          {/* Calendar Month Selector */}
          <div className="flex items-center justify-between px-6 py-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-gray-600 shadow-sm">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-[17px] font-bold text-gray-800">
              {format(currentDate, "yyyy年M月", { locale: ja })}
            </h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-gray-600 shadow-sm">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="px-5">
            {/* Day Names */}
            <div className="grid grid-cols-7 mb-3 text-center text-[11px] font-medium text-gray-500">
              <div className="text-red-400">日</div>
              <div>月</div>
              <div>火</div>
              <div>水</div>
              <div>木</div>
              <div>金</div>
              <div className="text-[#3DB2D3]">土</div>
            </div>
            
            {/* Days */}
            <div className="grid grid-cols-7 gap-y-3 gap-x-1">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const dayReservation = reservations.find(res => isSameDay(res.date, day));
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const isHol = isFacilityHoliday(day);

                return (
                  <div 
                    key={i} 
                    className={`flex flex-col items-center justify-center relative h-9 ${isHol ? 'cursor-default' : 'cursor-pointer'}`}
                    onClick={() => { if (!isHol) setSelectedDate(day); }}
                  >
                    <div className={`
                      flex items-center justify-center w-[34px] h-[34px] rounded-full text-[15px] transition-all
                      ${!isCurrentMonth ? 'text-gray-300 font-light' : (isHol ? 'text-[#FF6B8B] font-bold' : 'text-gray-700 font-medium')}
                      ${isSelected && !isHol ? 'bg-[#FF6B8B] text-white shadow-md font-bold' : ''}
                      ${isTodayDate && !isSelected && !isHol ? 'border-2 border-[#3DB2D3] text-[#3DB2D3]' : ''}
                    `}>
                      {format(day, "d")}
                    </div>
                    {dayReservation && !isHol && (
                      <div className={`w-1.5 h-1.5 rounded-full absolute bottom-0 ${isSelected ? 'bg-[#FF6B8B]' : (dayReservation.status === 'unconfirmed' ? 'bg-rose-500' : 'bg-[#3DB2D3]')}`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spacer / Divider area */}
          <div className="mt-2 h-3 bg-gradient-to-b from-white to-gray-50/50"></div>

          {/* Details Area */}
          <div className="border-t border-gray-100 flex-1 flex flex-col bg-gray-50/50">
            {/* Selected Date Header */}
            <div className="px-6 pt-3 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-gray-800 font-bold text-base">
                  {format(selectedDate, "M月d日", { locale: ja })}
                  <span className="text-sm font-normal ml-1">({format(selectedDate, "E", { locale: ja })})</span>
                </h3>
                {selectedReservation && (
                  <div className={`flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedReservation.status === 'confirmed' 
                      ? 'text-[#4CAF50] border-[#4CAF50]/30 bg-[#4CAF50]/5' 
                      : 'text-amber-500 border-amber-500/30 bg-amber-500/5'
                  }`}>
                    {selectedReservation.status === 'confirmed' ? (
                      <>
                        <CheckCircle2 size={12} className="mr-1" />
                        <span>承認済</span>
                      </>
                    ) : (
                      <>
                        <Clock size={12} className="mr-1" />
                        <span>未承認</span>
                      </>
                    )}
                  </div>
                )}
                {memos[format(selectedDate, 'yyyy-MM-dd')]?.text && (
                  <div className="text-xs text-gray-500 font-medium bg-gray-100/50 px-2 py-0.5 rounded-md ml-1 break-all whitespace-normal">
                    {memos[format(selectedDate, 'yyyy-MM-dd')].text}
                  </div>
                )}
              </div>
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
                
                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 z-50 overflow-hidden py-2">
                      {!selectedReservation && (
                        <button 
                          onClick={() => {
                            if (isPastDeadline(selectedDate)) {
                              setIsDeadlineAlertOpen(true);
                              setIsDropdownOpen(false);
                              return;
                            }
                            setFormData({ 
                              pickupTime: "15:30", 
                              pickupPlace: pickupLocations[0] || "", 
                              isPickupTimeUndecided: false,
                              dropoffTime: "17:30", 
                              dropoffPlace: dropoffLocations[0] || "",
                              isDropoffTimeUndecided: false
                            });
                            setModalMode('new');
                            setIsModalOpen(true);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-5 py-4 text-[15px] font-bold text-[#334155] hover:bg-[#EAF5F5] transition-colors active:bg-gray-50 flex items-center"
                        >
                          新規予約
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (selectedReservation) {
                            if (isPastDeadline(selectedDate)) {
                              setIsDeadlineAlertOpen(true);
                              setIsDropdownOpen(false);
                              return;
                            }
                            setFormData({
                              pickupTime: selectedReservation.pickup.time === "未定" ? "15:30" : selectedReservation.pickup.time,
                              pickupPlace: selectedReservation.pickup.place,
                              isPickupTimeUndecided: selectedReservation.pickup.time === "未定",
                              dropoffTime: selectedReservation.dropoff.time === "未定" ? "17:30" : selectedReservation.dropoff.time,
                              dropoffPlace: selectedReservation.dropoff.place,
                              isDropoffTimeUndecided: selectedReservation.dropoff.time === "未定"
                            });
                            setModalMode('edit');
                            setIsModalOpen(true);
                            setIsDropdownOpen(false);
                          }
                        }}
                        disabled={!selectedReservation}
                        className={`w-full text-left px-5 py-4 text-[15px] font-bold transition-colors flex items-center ${
                          !selectedReservation 
                            ? 'text-gray-300 bg-gray-50/30 cursor-not-allowed' 
                            : 'text-[#334155] hover:bg-[#EAF5F5] active:bg-gray-50'
                        }`}
                      >
                        {selectedReservation ? '編集・削除' : '編集データなし'}
                      </button>
                      <button 
                        onClick={() => {
                          setMemoInput(memos[format(selectedDate, 'yyyy-MM-dd')]?.text || "");
                          setIsMemoModalOpen(true);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-5 py-4 text-[15px] font-bold transition-colors flex items-center border-t border-gray-100 text-[#334155] hover:bg-[#EAF5F5] active:bg-gray-50"
                      >
                        {memos[format(selectedDate, 'yyyy-MM-dd')]?.text ? 'メモを編集' : 'メモを入力'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Reservation Details Content */}
            {selectedReservation ? (
              <div className="flex items-center justify-between px-6 py-3">
                <div className="text-center flex-1">
                  <div className="text-[28px] tracking-tight font-light text-gray-800 mb-1">{selectedReservation.pickup.time}</div>
                  <div className="text-xs text-gray-500 bg-white py-1 px-2 rounded border border-gray-100 inline-block max-w-full truncate shadow-sm">
                    {selectedReservation.pickup.place}
                  </div>
                </div>
                <div className="text-gray-300 px-3 flex flex-col items-center">
                  <div className="text-[10px] text-gray-400 mb-1">▶</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-[28px] tracking-tight font-light text-gray-800 mb-1">{selectedReservation.dropoff.time}</div>
                  <div className="text-xs text-gray-500 bg-white py-1 px-2 rounded border border-gray-100 inline-block max-w-full truncate shadow-sm">
                    {selectedReservation.dropoff.place}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CalendarIcon size={32} className="mb-3 text-gray-300 opacity-50" />
                <p className="text-sm">送迎予定はありません</p>
              </div>
            )}
          </div>


        </div>

        {/* Modal Overlay */}
        {isModalOpen && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white w-[90%] max-w-[340px] max-h-[90%] rounded-2xl flex flex-col shadow-2xl transition-transform transform">
              
              <div className="p-5 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-[13px] font-bold text-gray-800">{modalMode === 'edit' ? '登録変更' : '新規予約'}</h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="text-[17px] font-bold text-gray-800">
                  {format(selectedDate, "yyyy年M月d日 (E)", { locale: ja })}
                </div>
              </div>
              
              <hr className="border-gray-400 border-dashed border-t-[1.5px] mx-5" />

              <div className="p-5 flex-1 relative z-20">
                <div className="space-y-6">
                  
                  {/* Pickup */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 border-gray-300 rounded text-[#3DB2D3] focus:ring-[#3DB2D3]" 
                        checked={formData.isPickupTimeUndecided}
                        onChange={(e) => setFormData({ ...formData, isPickupTimeUndecided: e.target.checked })}
                      />
                      <span className="text-[13px] text-gray-600">未定</span>
                    </label>
                    
                    <div className="flex items-center gap-3 relative z-40">
                      <label className="text-[13px] text-gray-600 w-[72px] shrink-0">お迎え時間</label>
                      <div className="flex-1 relative z-[60]">
                        <button
                          type="button"
                          disabled={formData.isPickupTimeUndecided}
                          onClick={() => setIsPickupTimeDropdownOpen(!isPickupTimeDropdownOpen)}
                          className={`flex items-center justify-between w-full border border-gray-300 rounded-full px-4 py-2.5 shadow-sm transition-colors outline-none ${
                            formData.isPickupTimeUndecided
                              ? 'bg-gray-100 cursor-not-allowed'
                              : 'bg-white hover:border-[#3DB2D3] focus:border-[#3DB2D3] cursor-pointer'
                          }`}
                        >
                          <span className={`text-[15px] font-medium flex-1 text-left tracking-widest ${formData.isPickupTimeUndecided ? 'text-gray-400' : 'text-gray-800'}`}>
                            {formData.isPickupTimeUndecided ? "未定" : formData.pickupTime}
                          </span>
                          <Clock size={16} className={`${formData.isPickupTimeUndecided ? 'text-gray-300' : 'text-gray-500'}`} />
                        </button>
                        
                        {isPickupTimeDropdownOpen && !formData.isPickupTimeUndecided && (
                          <div className="absolute left-0 top-full mt-1.5 w-full max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border-none py-1.5 z-[70]">
                            {timeOptions.map((time, idx) => {
                              const isSelected = formData.pickupTime === time;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  ref={isSelected ? pickupTimeSelectedRef : null}
                                  onClick={() => {
                                    setFormData({ ...formData, pickupTime: time });
                                    setIsPickupTimeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-[14px] font-bold tracking-widest transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100 ${
                                    isSelected ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-700"
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 relative z-30">
                      <label className="text-[13px] text-gray-600 w-[72px] shrink-0">場所</label>
                      <div className="flex-1 relative z-50">
                        <button
                          type="button"
                          onClick={() => setIsPickupDropdownOpen(!isPickupDropdownOpen)}
                          className="flex items-center justify-between w-full border border-gray-300 rounded-full px-4 py-2.5 bg-white shadow-sm focus:border-[#3DB2D3] transition-colors outline-none cursor-pointer"
                        >
                          <span className="text-[15px] text-gray-800 font-medium flex-1 text-left">{formData.pickupPlace}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPickupDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isPickupDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border-none py-1.5 overflow-hidden z-[60]">
                            {pickupLocations.map((loc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, pickupPlace: loc });
                                  setIsPickupDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-[14px] font-bold transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100 ${
                                  formData.pickupPlace === loc ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-700"
                                }`}
                              >
                                {loc}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-400 border-dashed border-t-[1.5px]" />

                  {/* Dropoff */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 border-gray-300 rounded text-[#3DB2D3] focus:ring-[#3DB2D3]" 
                        checked={formData.isDropoffTimeUndecided}
                        onChange={(e) => setFormData({ ...formData, isDropoffTimeUndecided: e.target.checked })}
                      />
                      <span className="text-[13px] text-gray-600">未定</span>
                    </label>
                    
                    <div className="flex items-center gap-3 relative z-20">
                      <label className="text-[13px] text-gray-600 w-[72px] shrink-0">お送り時間</label>
                      <div className="flex-1 relative z-[50]">
                        <button
                          type="button"
                          disabled={formData.isDropoffTimeUndecided}
                          onClick={() => setIsDropoffTimeDropdownOpen(!isDropoffTimeDropdownOpen)}
                          className={`flex items-center justify-between w-full border border-gray-300 rounded-full px-4 py-2.5 shadow-sm transition-colors outline-none ${
                            formData.isDropoffTimeUndecided
                              ? 'bg-gray-100 cursor-not-allowed'
                              : 'bg-white hover:border-[#3DB2D3] focus:border-[#3DB2D3] cursor-pointer'
                          }`}
                        >
                          <span className={`text-[15px] font-medium flex-1 text-left tracking-widest ${formData.isDropoffTimeUndecided ? 'text-gray-400' : 'text-gray-800'}`}>
                            {formData.isDropoffTimeUndecided ? "未定" : formData.dropoffTime}
                          </span>
                          <Clock size={16} className={`${formData.isDropoffTimeUndecided ? 'text-gray-300' : 'text-gray-500'}`} />
                        </button>
                        
                        {isDropoffTimeDropdownOpen && !formData.isDropoffTimeUndecided && (
                          <div className="absolute left-0 top-full mt-1.5 w-full max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border-none py-1.5 z-[70]">
                            {timeOptions.map((time, idx) => {
                              const isSelected = formData.dropoffTime === time;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  ref={isSelected ? dropoffTimeSelectedRef : null}
                                  onClick={() => {
                                    setFormData({ ...formData, dropoffTime: time });
                                    setIsDropoffTimeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-[14px] font-bold tracking-widest transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100 ${
                                    isSelected ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-700"
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <label className="text-[13px] text-gray-600 w-[72px] shrink-0">場所</label>
                      <div className="flex-1 relative z-40">
                        <button
                          type="button"
                          onClick={() => setIsDropoffDropdownOpen(!isDropoffDropdownOpen)}
                          className="flex items-center justify-between w-full border border-gray-300 rounded-full px-4 py-2.5 bg-white shadow-sm focus:border-[#3DB2D3] transition-colors outline-none cursor-pointer"
                        >
                          <span className="text-[15px] text-gray-800 font-medium flex-1 text-left">{formData.dropoffPlace}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isDropoffDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isDropoffDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border-none py-1.5 overflow-hidden z-[60]">
                            {dropoffLocations.map((loc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, dropoffPlace: loc });
                                  setIsDropoffDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-[14px] font-bold transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100 ${
                                  formData.dropoffPlace === loc ? "bg-[#e8f7fa] text-[#3DB2D3]" : "text-gray-700"
                                }`}
                              >
                                {loc}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Submit Buttons */}
              <div className="p-5 pt-2 flex flex-col gap-3 relative z-10">
                <button 
                  onClick={() => {
                    setCopyCalendarDate(selectedDate);
                    setCopySelectedDates([]);
                    setIsCopyModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-[#3DB2D3] text-[#3DB2D3] hover:bg-[#EAF5F5] rounded-full font-bold text-[13px] transition-all active:scale-[0.98]"
                >
                  <Copy size={16} />
                  この内容を他の日にもコピーする
                </button>
                <button 
                  onClick={handleSave}
                  className="w-full py-3 bg-[#42ADC9] hover:bg-[#329ab8] text-white rounded-full font-bold text-[15px] shadow-sm transition-all active:scale-[0.98]"
                >
                  {modalMode === 'edit' ? '変更する' : '予約する'}
                </button>
              </div>

              {/* Delete Button */}
              {modalMode === 'edit' && (
                <>
                  <hr className="border-gray-400 border-dashed border-t-[1.5px]" />
                  <div className="p-3 mb-2 flex justify-center">
                    <button 
                      onClick={handleDelete}
                      className="text-[#FF6B8B] hover:bg-red-50 px-6 py-2 rounded-full font-bold text-[14px] transition-all"
                    >
                      削除する
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* Copy Modal Overlay */}
        {isCopyModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white w-full h-[92%] sm:h-auto sm:max-h-[90%] sm:w-[90%] sm:rounded-3xl rounded-t-[32px] flex flex-col shadow-2xl transition-transform transform">
              
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Copy size={20} className="text-[#3DB2D3]" />
                  他の日にも一括コピー
                </h2>
                <button 
                  onClick={() => setIsCopyModalOpen(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 bg-gray-50/30">
                {/* Tier 1: Day of week toggles */}
                <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-[13px] text-gray-600 font-bold mb-3 text-center">曜日で一括選択（今月分のみ）</p>
                  <div className="flex justify-between gap-2">
                    {[
                      { label: "月", val: 1 },
                      { label: "火", val: 2 },
                      { label: "水", val: 3 },
                      { label: "木", val: 4 },
                      { label: "金", val: 5 },
                    ].map(day => {
                      const startRange = startOfMonth(copyCalendarDate);
                      const endRange = endOfMonth(copyCalendarDate);
                      const targetDays = eachDayOfInterval({ start: startRange, end: endRange }).filter(d => d.getDay() === day.val && !isFacilityHoliday(d));
                      const isAllSelected = targetDays.length > 0 && targetDays.every(td => copySelectedDates.some(selected => isSameDay(selected, td)));
                      
                      return (
                        <button
                          key={day.val}
                          onClick={() => toggleDayOfWeek(day.val)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors active:scale-95 ${
                            isAllSelected 
                              ? 'bg-[#3DB2D3]/10 border-[#3DB2D3] text-[#3DB2D3]' 
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tier 2: Calendar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <button onClick={prevCopyMonth} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-gray-600 shadow-sm">
                      <ChevronLeft size={18} />
                    </button>
                    <h3 className="text-[15px] font-bold text-gray-800">
                      {format(copyCalendarDate, "yyyy年M月", { locale: ja })}
                    </h3>
                    <button onClick={nextCopyMonth} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-gray-600 shadow-sm">
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 mb-3 text-center text-[11px] font-medium text-gray-500">
                    <div className="text-red-400">日</div>
                    <div>月</div>
                    <div>火</div>
                    <div>水</div>
                    <div>木</div>
                    <div>金</div>
                    <div className="text-[#3DB2D3]">土</div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                    {copyCalendarDays.map((day, i) => {
                      const isCurrentMonth = isSameMonth(day, copyCalendarDate);
                      const isSelected = copySelectedDates.some(d => isSameDay(d, day));
                      const isBaseSelectedDate = isSameDay(day, selectedDate);
                      const isHol = isFacilityHoliday(day);
                      
                      return (
                        <div 
                          key={i} 
                          className={`flex flex-col items-center justify-center h-9 ${isHol || isBaseSelectedDate ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={() => {
                            if (!isBaseSelectedDate && !isHol) {
                              toggleCopyDate(day);
                            }
                          }}
                        >
                          <div className={`
                            flex items-center justify-center w-[34px] h-[34px] rounded-full text-[15px] transition-all
                            ${!isCurrentMonth ? 'text-gray-300 font-light' : (isHol ? 'text-[#FF6B8B] font-bold' : 'text-gray-700 font-medium')}
                            ${isBaseSelectedDate ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : (isSelected ? 'bg-[#3DB2D3] text-white shadow-md font-bold' : (isHol ? '' : 'hover:bg-gray-50'))}
                          `}>
                            {format(day, "d")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200"></div>元の予約日</div>
                    <div className="flex items-center gap-1 ml-2"><div className="w-3 h-3 rounded-full bg-[#3DB2D3]"></div>コピー先</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button 
                  onClick={handleBulkCopySave}
                  disabled={copySelectedDates.length === 0}
                  className="w-full py-4 bg-[#3DB2D3] hover:bg-[#329ab8] disabled:bg-gray-300 disabled:shadow-none text-white rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.3)] transition-all active:scale-[0.98]"
                >
                  {copySelectedDates.length > 0 ? `選択した ${copySelectedDates.length} 件の日程にコピーを確定する` : 'コピー先の日程を選択してください'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Location Management Modal */}
        {isLocationModalOpen && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white w-full h-[92%] sm:h-auto sm:max-h-[90%] sm:w-[90%] sm:rounded-3xl rounded-t-[32px] flex flex-col shadow-2xl transition-transform transform relative overflow-hidden">
              
              <div className="flex justify-between items-center p-6 border-b border-gray-100 relative z-10 bg-white">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <MapPinIcon size={20} className="text-[#3DB2D3]" />
                  送迎場所
                </h2>
                <button 
                  onClick={() => setIsLocationModalOpen(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6 relative z-10 pb-24">
                
                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-full w-full">
                  <button
                    onClick={() => setLocationTab('pickup')}
                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
                      locationTab === 'pickup' ? 'bg-[#3DB2D3] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    お迎え
                  </button>
                  <button
                    onClick={() => setLocationTab('dropoff')}
                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
                      locationTab === 'dropoff' ? 'bg-[#3DB2D3] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    お送り
                  </button>
                </div>

                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setActiveEditIndex(null);
                      setSubLocationForm({ name: '', address: '' });
                      setIsSubLocationModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-[#3DB2D3] text-[15px] font-bold hover:opacity-80 transition-opacity"
                  >
                    <Plus size={18} />
                    {locationTab === 'pickup' ? 'お迎え先を登録' : 'お送り先を登録'}
                  </button>
                </div>

                {/* List */}
                <div className="space-y-0">
                  {(locationTab === 'pickup' ? pickupLocations : dropoffLocations).map((loc, idx) => (
                    <div key={idx} className="flex justify-between items-center py-4 border-b border-gray-200 border-dashed group">
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-bold text-gray-800">{loc}</span>
                        <span className="text-[11px] text-gray-400">住所 : 未指定</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setActiveEditIndex(idx);
                            let currentAddress = '';
                            try {
                              const stored = localStorage.getItem("pico_facility_locations");
                              if (stored) {
                                const parsed = JSON.parse(stored);
                                const arr = parsed[locationTab] || [];
                                if (arr[idx]) {
                                  currentAddress = arr[idx].address === '未指定' ? '' : arr[idx].address;
                                }
                              }
                            } catch(e) {}
                            setSubLocationForm({ name: loc, address: currentAddress });
                            setIsSubLocationModalOpen(true);
                          }}
                          className="text-gray-300 hover:text-[#3DB2D3] transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => locationTab === 'pickup' ? deletePickupLocation(idx) : deleteDropoffLocation(idx)}
                          className="text-gray-300 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Decorative Images */}
              <img 
                src="/chou_2.png" 
                alt="chou" 
                className="absolute bottom-0 right-28 w-[80px] h-auto object-contain pointer-events-none opacity-80 z-50" 
              />
              <img 
                src="/usagi_3.png" 
                alt="usagi" 
                className="absolute bottom-0 right-12 w-[42px] h-auto object-contain pointer-events-none opacity-90 z-50" 
              />

            </div>
          </div>
        )}

        {/* Sub Location Modal (Add/Edit) */}
        {isSubLocationModalOpen && (
          <div className="absolute inset-0 bg-black/40 z-[60] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white w-[90%] sm:w-[400px] rounded-3xl flex flex-col shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white relative z-10">
                <h2 className="text-lg font-bold text-gray-800">
                  {locationTab === 'pickup' ? 'お迎え先登録' : 'お送り先登録'}
                </h2>
                <button 
                  onClick={() => setIsSubLocationModalOpen(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 bg-white space-y-6 relative z-10">
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[13px] font-bold text-gray-800">名称</label>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">必須</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={subLocationForm.name}
                      onChange={(e) => {
                        if (e.target.value.length <= 15) {
                          setSubLocationForm({ ...subLocationForm, name: e.target.value });
                        }
                      }}
                      placeholder="例 : 家族送迎、自宅など"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] bg-gray-50/50 outline-none focus:border-[#3DB2D3] focus:bg-white transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                      {subLocationForm.name.length}/15
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[13px] font-bold text-gray-800">住所</label>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">任意</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={subLocationForm.address}
                      onChange={(e) => {
                        if (e.target.value.length <= 50) {
                          setSubLocationForm({ ...subLocationForm, address: e.target.value });
                        }
                      }}
                      placeholder="例 : 未指定"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] bg-gray-50/50 outline-none focus:border-[#3DB2D3] focus:bg-white transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                      {subLocationForm.address.length}/50
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      if (!subLocationForm.name.trim()) return;
                      const newName = subLocationForm.name.trim();
                      const newAddress = subLocationForm.address.trim() || '未指定';
                      
                      if (activeEditIndex !== null) {
                        if (locationTab === 'pickup') {
                          const oldVal = pickupLocations[activeEditIndex];
                          const updated = [...pickupLocations];
                          updated[activeEditIndex] = newName;
                          setPickupLocations(updated);
                          syncLocationsToStorage('pickup', 'edit', activeEditIndex, newName, newAddress);
                          if (formData.pickupPlace === oldVal) {
                            setFormData(prev => ({ ...prev, pickupPlace: newName }));
                          }
                        } else {
                          const oldVal = dropoffLocations[activeEditIndex];
                          const updated = [...dropoffLocations];
                          updated[activeEditIndex] = newName;
                          setDropoffLocations(updated);
                          syncLocationsToStorage('dropoff', 'edit', activeEditIndex, newName, newAddress);
                          if (formData.dropoffPlace === oldVal) {
                            setFormData(prev => ({ ...prev, dropoffPlace: newName }));
                          }
                        }
                      } else {
                        if (locationTab === 'pickup') {
                          setPickupLocations([...pickupLocations, newName]);
                          syncLocationsToStorage('pickup', 'add', null, newName, newAddress);
                        } else {
                          setDropoffLocations([...dropoffLocations, newName]);
                          syncLocationsToStorage('dropoff', 'add', null, newName, newAddress);
                        }
                      }
                      setIsSubLocationModalOpen(false);
                    }}
                    disabled={!subLocationForm.name.trim()}
                    className="w-full py-3.5 bg-gray-200 hover:bg-[#3DB2D3] hover:text-white disabled:bg-gray-200 disabled:text-gray-400 text-gray-600 rounded-2xl font-bold text-[15px] transition-colors"
                  >
                    登録する
                  </button>
                </div>

              </div>
              {/* Decorative Images */}
              <img 
                src="/chou_2.png" 
                alt="chou" 
                className="absolute bottom-0 right-24 w-[70px] h-auto object-contain pointer-events-none opacity-80 z-50" 
              />
              <img 
                src="/usagi_3.png" 
                alt="usagi" 
                className="absolute bottom-0 right-10 w-[38px] h-auto object-contain pointer-events-none opacity-90 z-50" 
              />
            </div>
          </div>
        )}

        {/* Memo Modal Overlay */}
        {isMemoModalOpen && (
          <div className="absolute inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white w-full h-[50%] sm:h-auto sm:w-[90%] sm:rounded-3xl rounded-t-[32px] flex flex-col shadow-2xl transition-transform transform">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">メモの入力</h2>
                <button 
                  onClick={() => setIsMemoModalOpen(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                <label className="text-sm text-gray-600 font-bold mb-2 block">メモ (最大10文字)</label>
                <input 
                  type="text" 
                  maxLength={10}
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white shadow-sm outline-none focus:border-[#3DB2D3] text-gray-800"
                  placeholder="メモを入力..."
                />
              </div>
              <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button 
                  onClick={() => {
                    const dateKey = format(selectedDate, 'yyyy-MM-dd');
                    const newMemos = { ...memos };
                    if (memoInput.trim()) {
                      newMemos[dateKey] = {
                        text: memoInput.trim(),
                        userId: activeUser.id.toString(),
                        facilityId: currentFacilityId
                      };
                    } else {
                      delete newMemos[dateKey];
                    }
                    setMemos(newMemos);
                    setIsMemoModalOpen(false);
                  }}
                  className="w-full py-4 bg-[#3DB2D3] hover:bg-[#329ab8] text-white rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.3)] transition-all active:scale-[0.98]"
                >
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deadline Alert Modal */}
        {isDeadlineAlertOpen && (
          <div className="absolute inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-[340px] rounded-[24px] p-6 relative shadow-2xl flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#FFF0F3] rounded-full flex items-center justify-center mb-4">
                <Clock className="text-[#FF6B8B]" size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-[15px] font-bold text-gray-800 mb-2 leading-relaxed">
                予約変更可能期間を過ぎています。<br/>直接施設の方へご連絡ください。
              </h2>
              <div className="w-full mt-4">
                <button 
                  onClick={() => setIsDeadlineAlertOpen(false)}
                  className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3 rounded-full font-bold text-[14px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Limit Alert Modal */}
        {isLimitAlertOpen && (
          <div className="absolute inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-[340px] rounded-[24px] p-6 relative shadow-2xl flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#FFF0F3] rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-[#FF6B8B]" size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-[15px] font-bold text-gray-800 mb-2 leading-relaxed">
                登録日数が上限に達しているため<br/>登録できません
              </h2>
              <div className="w-full mt-4">
                <button 
                  onClick={() => setIsLimitAlertOpen(false)}
                  className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3 rounded-full font-bold text-[14px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Notifications Modal */}
        {isNotificationsOpen && (
          <div className="absolute inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#F8F9FA] w-full max-h-[85vh] rounded-[32px] flex flex-col relative shadow-2xl animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between p-6 bg-white rounded-t-[32px] border-b border-gray-100 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <h2 className="text-[18px] font-bold text-gray-800 flex items-center gap-2">
                    <Bell className="text-[#3DB2D3]" size={20} strokeWidth={2.5} />
                    お知らせ
                  </h2>
                  <img 
                    src="/chou_2.png" 
                    alt="butterfly" 
                    className="h-10 w-auto object-contain drop-shadow-sm opacity-90 relative top-1"
                  />
                </div>
                <button 
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
              
              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {announcements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-10">
                    <Bell size={32} className="text-gray-300" />
                    <p className="font-bold text-[14px]">新しいお知らせはありません</p>
                  </div>
                ) : (
                  announcements.map((item) => (
                    <div key={item.id} className="bg-white p-5 rounded-[20px] shadow-sm border border-gray-100 flex flex-col gap-2">
                      <span className="text-[12px] font-bold text-gray-400">{item.datetime}</span>
                      <p className="text-[14px] font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Toast Notification */}
      {showToast.visible && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white/90 backdrop-blur-md px-6 py-3.5 rounded-full shadow-lg border border-gray-100 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[#3DB2D3]" />
            <span className="text-[#334155] font-bold text-[14px]">{showToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex justify-center min-h-screen bg-zinc-100"><div className="w-full max-w-[420px] bg-[#A1DDF0] min-h-screen" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
