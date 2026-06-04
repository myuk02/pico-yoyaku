"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building, 
  Bell, 
  LayoutGrid, 
  LogOut, 
  Users, 
  Cloud, 
  Search, 
  Calendar, 
  MapPin, 
  User,
  X,
  Plus,
  Trash2,
  Minus,
  Pencil,
  ChevronRight,
  Book,
  CheckCircle2
} from "lucide-react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const FACILITY_MAP: Record<string, string> = {
  "葭津": "facility-1773884904073",
  "渡": "facility-1773884917420",
  "大篠津": "facility-1773884944675",
  "湯梨浜": "facility-1773884954458",
  "テスト用": "facility-1774355827269",
};

export default function UsersList() {
  const pathname = usePathname();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const initialUsers = [
    { id: 1, name: "杉原 遥香", status: "共有済", days: null as number | null },
    { id: 2, name: "潮 彩華", status: "保護者と共有", days: null as number | null },
    { id: 3, name: "長谷川 樂", status: "保護者と共有", days: null as number | null },
    { id: 4, name: "内山 想太", status: "保護者と共有", days: null as number | null },
    { id: 5, name: "岩田 樂", status: "保護者と共有", days: null as number | null },
    { id: 6, name: "松本 楓", status: "保護者と共有", days: null as number | null },
    { id: 7, name: "檀上 航平", status: "保護者と共有", days: null as number | null },
    { id: 8, name: "吉村 志生", status: "保護者と共有", days: null as number | null },
    { id: 9, name: "新川 翔空", status: "共有済", days: null as number | null },
    { id: 10, name: "田中 咲弥", status: "共有済", days: null as number | null },
    { id: 11, name: "矢倉 奈緒", status: "共有済", days: null as number | null },
    { id: 12, name: "高倉 晃都", status: "共有済", days: null as number | null },
    { id: 13, name: "小野 星夏", status: "保護者と共有", days: null as number | null },
    { id: 14, name: "野口 美雲", status: "保護者と共有", days: null as number | null },
    { id: 15, name: "阿部 うい", status: "保護者と共有", days: null as number | null },
    { id: 16, name: "大江 弘人", status: "共有済", days: null as number | null },
  ];

  const [users, setUsers] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<any>({});
  
  const [isClient, setIsClient] = useState(false);
  const [showToast, setShowToast] = useState<{message: string, visible: boolean}>({message: "", visible: false});
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
    const fetchFirebaseUsers = async () => {
      if (!isClient) return;
      try {
        const facilityId = localStorage.getItem('pico_selected_facility_id') || FACILITY_MAP[selectedFacilityName] || FACILITY_MAP["葭津"];
        const q = query(collection(db, "children"), where("facilityId", "==", facilityId));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "名称未設定",
            status: "保護者と共有",
            days: typeof data.days === 'number' ? data.days : null,
            isHidden: data.isHidden === true,
            invitationCode: data.invitationCode || null,
            pickupLocation: Array.isArray(data.pickupLocation) ? data.pickupLocation : [],
            dropoffLocation: Array.isArray(data.dropoffLocation) ? data.dropoffLocation : []
          };
        });
        setUsers(fetched);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchFirebaseUsers();
  }, [selectedFacilityName, isClient]);

  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [locationTab, setLocationTab] = useState<'pickup' | 'dropoff'>('pickup');
  const [shareModalUserId, setShareModalUserId] = useState<string | number | null>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);

  const handleDeleteLocation = async (id: number) => {
    if (!selectedUserId) return;
    try {
      const userRef = doc(db, "children", selectedUserId.toString());
      const targetUser = users.find(u => u.id === selectedUserId);
      if (!targetUser) return;

      let updatedList = [];
      if (locationTab === 'pickup') {
        const currentList = Array.isArray(targetUser.pickupLocation) ? targetUser.pickupLocation : [];
        updatedList = currentList.filter((loc: any) => loc.id !== id);
        await updateDoc(userRef, { pickupLocation: updatedList });
      } else {
        const currentList = Array.isArray(targetUser.dropoffLocation) ? targetUser.dropoffLocation : [];
        updatedList = currentList.filter((loc: any) => loc.id !== id);
        await updateDoc(userRef, { dropoffLocation: updatedList });
      }
      
      setUsers(prev => prev.map(u => 
        u.id === selectedUserId 
          ? { ...u, ...(locationTab === 'pickup' ? { pickupLocation: updatedList } : { dropoffLocation: updatedList }) }
          : u
      ));
    } catch (err) {
      console.error("Error deleting location:", err);
    }
  };

  const handleEditLocationClick = (loc: { id: number, name: string, address: string }) => {
    setEditingLocationId(loc.id);
    setNewLocationName(loc.name);
    setNewLocationAddress(loc.address === "未指定" ? "" : loc.address);
    setIsInputModalOpen(true);
  };

  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [userInfoName, setUserInfoName] = useState("");
  const [userInfoDays, setUserInfoDays] = useState("0");
  const [isUserInfoRegistered, setIsUserInfoRegistered] = useState(false);
  const [userInfoSelectedId, setUserInfoSelectedId] = useState<string | number | null>(null);

  const handleAddUser = () => {
    if (!newUserName.trim()) return;
    const newUser = {
      id: "mock-" + Date.now(),
      name: newUserName.trim(),
      status: "未共有",
      days: null,
      isHidden: false
    };
    setUsers([...users, newUser]);
    setNewUserName("");
    setIsAddUserModalOpen(false);
  };

  const [pickupLocations, setPickupLocations] = useState([
    { id: 1, name: "家族送迎", address: "未指定" },
    { id: 2, name: "自宅", address: "未指定" },
    { id: 3, name: "県立〇〇小学校", address: "未指定" },
  ]);
  
  const [dropoffLocations, setDropoffLocations] = useState([
    { id: 1, name: "自宅", address: "未指定" },
    { id: 2, name: "祖父母宅", address: "未指定" },
  ]);

  useEffect(() => {
    const storedLocations = localStorage.getItem("pico_facility_locations");
    if (storedLocations) {
      const parsed = JSON.parse(storedLocations);
      if (parsed.pickup) setPickupLocations(parsed.pickup);
      if (parsed.dropoff) setDropoffLocations(parsed.dropoff);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("pico_facility_locations", JSON.stringify({
        pickup: pickupLocations,
        dropoff: dropoffLocations
      }));
    }
  }, [pickupLocations, dropoffLocations, isClient]);

  const targetUser = users.find(u => u.id === selectedUserId);
  const activeLocations = (() => {
    if (!targetUser) return [];
    const locData = locationTab === 'pickup' ? targetUser.pickupLocation : targetUser.dropoffLocation;
    return Array.isArray(locData) ? locData : [];
  })();

  const handleRegisterClick = () => {
    if (!newLocationName.trim()) return;
    setIsInputModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmRegister = async () => {
    if (!selectedUserId) return;
    
    try {
      const userRef = doc(db, "children", selectedUserId.toString());
      const targetUser = users.find(u => u.id === selectedUserId);
      if (!targetUser) return;
      
      let updatedList = [];
      if (locationTab === 'pickup') {
        const currentList = Array.isArray(targetUser.pickupLocation) ? targetUser.pickupLocation : [];
        if (editingLocationId) {
          updatedList = currentList.map((loc: any) => loc.id === editingLocationId ? { ...loc, name: newLocationName.trim(), address: newLocationAddress.trim() || "未指定" } : loc);
        } else {
          updatedList = [...currentList, { id: Date.now(), name: newLocationName.trim(), address: newLocationAddress.trim() || "未指定" }];
        }
        await updateDoc(userRef, { pickupLocation: updatedList });
      } else {
        const currentList = Array.isArray(targetUser.dropoffLocation) ? targetUser.dropoffLocation : [];
        if (editingLocationId) {
          updatedList = currentList.map((loc: any) => loc.id === editingLocationId ? { ...loc, name: newLocationName.trim(), address: newLocationAddress.trim() || "未指定" } : loc);
        } else {
          updatedList = [...currentList, { id: Date.now(), name: newLocationName.trim(), address: newLocationAddress.trim() || "未指定" }];
        }
        await updateDoc(userRef, { dropoffLocation: updatedList });
      }
      
      setUsers(prev => prev.map(u => 
        u.id === selectedUserId 
          ? { 
              ...u, 
              ...(locationTab === 'pickup' ? { pickupLocation: updatedList } : { dropoffLocation: updatedList }) 
            }
          : u
      ));
      
      setShowToast({ message: "保存しました", visible: true });
      setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
    } catch (err) {
      console.error("Error saving location:", err);
      alert("保存に失敗しました");
    }

    setIsConfirmModalOpen(false);
    setNewLocationName("");
    setNewLocationAddress("");
  };

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
    try {
      const userRef = doc(db, "children", userInfoSelectedId.toString());
      await updateDoc(userRef, { 
        name: userInfoName,
        days: newDays
      });
      
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userInfoSelectedId 
          ? { ...u, name: userInfoName, days: newDays }
          : u
      ));
      
      setShowToast({ message: "利用者情報を保存しました", visible: true });
      setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
    } catch (err) {
      console.error("Error saving user info:", err);
      alert("保存に失敗しました");
    }
    
    setIsUserInfoModalOpen(false);
  };

  const handleHideUser = async () => {
    if (userInfoSelectedId === null) return;
    try {
      const userRef = doc(db, "children", userInfoSelectedId.toString());
      await updateDoc(userRef, { isHidden: true });
      
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userInfoSelectedId ? { ...u, isHidden: true } : u
      ));
      
      setShowToast({ message: "非表示リストに移動しました", visible: true });
      setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
    } catch (err) {
      console.error("Error hiding user:", err);
      alert("非表示処理に失敗しました");
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
        <div className="flex items-center gap-12 mb-8 pl-2 relative z-10 max-w-[1000px]">
          <h1 className="text-[24px] font-bold text-gray-800 tracking-wide">利用者一覧</h1>
          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center gap-2 bg-[#3DB2D3] text-white hover:bg-[#329ab8] px-6 py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
          >
            <Plus size={18} strokeWidth={3} />
            利用者を追加
          </button>
        </div>
        
        {/* Flex Wrap Container (Light Blue Box) */}
        <div className="bg-[#a1ddf0] rounded-3xl p-8 flex flex-wrap gap-x-6 gap-y-6 relative z-10 mx-auto justify-center md:justify-start">
          
          {/* うさぎ画像（右上に配置、枠組みにぴったり乗るように） */}
          <div className="absolute bottom-full right-[40px] z-40 pointer-events-none">
            <img 
              src="/usagi_6.png" 
              alt="usagi" 
              className="w-[210px] h-auto object-contain drop-shadow-md" 
            />
          </div>

          {users.filter(user => !user.isHidden).map((user) => (
            <div key={user.id} className="relative pt-[22px] group w-[165px] h-[225px] shrink-0">
              
              {/* Floating Name Tag */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#EBF7FA] border border-[#3DB2D3] text-[#3DB2D3] font-bold px-2 py-1.5 rounded-t-[14px] z-10 text-[12px] whitespace-nowrap overflow-hidden text-ellipsis tracking-normal shadow-sm text-center min-w-[110px] max-w-[155px] transition-all duration-300 group-hover:-translate-y-1">
                {user.name}
              </div>

              {/* Card Body */}
              <div className="bg-white rounded-[24px] border-[3px] border-[#a1ddf0] p-3 flex flex-col gap-2 shadow-sm group-hover:shadow-[0_8px_24px_rgba(61,178,211,0.15)] group-hover:-translate-y-1 transition-all duration-300 h-full relative z-0">
                
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
                      const isRegistered = user.days !== null; 
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

                {/* Status Badge */}
                <div className="mt-1 pt-2 flex justify-center">
                  <div 
                    onClick={() => setShareModalUserId(user.id)}
                    className={`w-[95%] mx-auto text-center font-bold px-1 py-1.5 rounded-full text-[11px] tracking-tight flex items-center justify-center gap-1.5 border cursor-pointer ${
                    user.status === "共有済"
                      ? "bg-gray-50 text-gray-500 border-gray-300"
                      : "bg-[#F0F8FB] text-[#3DB2D3] border-[#3DB2D3]/40"
                  }`}>
                    {user.status === "共有済" && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}
                    {user.status === "保護者と共有" && <div className="w-1.5 h-1.5 rounded-full bg-[#3DB2D3]"></div>}
                    {user.status}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Location Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] border-[4px] border-[#a1ddf0] p-6 relative shadow-2xl flex flex-col min-h-[460px] overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="w-10"></div> {/* Spacer for centering */}
              <h2 className="text-[20px] font-bold text-gray-800 tracking-wider">送迎場所</h2>
              <button 
                onClick={() => setSelectedUserId(null)}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Tabs */}
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

            {/* Add Button */}
            <button 
              onClick={() => {
                setEditingLocationId(null);
                setNewLocationName("");
                setNewLocationAddress("");
                setIsInputModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-[#3DB2D3] font-bold text-[14px] hover:text-[#329ab8] transition-colors mb-2 w-fit px-2 py-1 rounded-lg hover:bg-[#EBF7FA] active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              {locationTab === 'pickup' ? 'お迎え先を登録' : 'お送り先を登録'}
            </button>

            {/* List */}
            <div className="flex-1 overflow-y-auto mb-10">
              <div className="flex flex-col">
                {activeLocations.map((loc, idx) => (
                  <div key={idx} className="flex justify-between items-center py-4 border-b border-dashed border-gray-400 group">
                    <div className="flex flex-col gap-1 pl-2">
                      <span className="text-[16px] font-bold text-gray-800 tracking-wide">{loc.name}</span>
                      <span className="text-[12px] text-gray-400 font-medium">住所：{loc.address}</span>
                    </div>
                    <div className="flex items-center gap-1 mr-1">
                      <button 
                        onClick={() => handleEditLocationClick(loc)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors active:scale-95"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:bg-rose-50 hover:text-rose-500 transition-colors active:scale-95"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorations Bottom Right */}
            <img 
              src="/chou_2.png" 
              alt="chou" 
              className="absolute bottom-0 right-28 w-[85px] object-contain pointer-events-none opacity-90" 
            />
            <img 
              src="/usagi_3.png" 
              alt="usagi" 
              className="absolute bottom-0 right-12 w-12 object-contain pointer-events-none drop-shadow-sm" 
            />
          </div>
        </div>
      )}

      {/* Input Modal */}
      {isInputModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col">
            <h2 className="text-[20px] font-bold text-gray-800 mb-6 text-left tracking-wide">
              {editingLocationId 
                ? (locationTab === 'pickup' ? 'お迎え先編集' : 'お送り先編集')
                : (locationTab === 'pickup' ? 'お迎え先登録' : 'お送り先登録')}
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
              {editingLocationId ? '更新する' : '登録する'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[340px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col items-center text-center">
            <img 
              src="/usagi_7.png" 
              alt="usagi" 
              className="w-24 h-auto object-contain drop-shadow-sm mb-4" 
            />
            <h2 className="text-[18px] font-bold text-gray-800 mb-8 tracking-wide">
              {editingLocationId ? '更新しますか？' : '登録しますか？'}
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
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[480px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col">
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
              {/* Name Input */}
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

              {/* Days Input */}
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

            {/* Actions */}
            <div className="flex flex-col items-center mt-4">
              <button 
                onClick={handleSaveUserInfo}
                className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-4 rounded-full font-bold text-[16px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
              >
                {!isUserInfoRegistered ? "登録する" : "変更する"}
              </button>
              
              <button 
                onClick={handleHideUser}
                className="mt-6 text-gray-400 hover:text-red-500 underline text-[13px] font-medium transition-colors"
              >
                この利用者を非表示にする
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[500px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col min-h-[300px]">
            <h2 className="text-[20px] font-bold text-gray-800 mb-8 tracking-wide flex items-center gap-2">
              <User className="text-[#3DB2D3]" size={24} strokeWidth={2.5} />
              利用者を追加
            </h2>
            <button 
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95 z-10"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            
            {/* Input Field */}
            <div className="flex flex-col gap-2 mb-8 relative z-10">
              <label className="text-[14px] font-bold text-gray-700">利用者名（お名前）</label>
              <input 
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="お名前を入力してください"
                className="w-full bg-white border-2 border-gray-200 focus:border-[#3DB2D3] rounded-2xl px-4 py-3.5 text-gray-800 text-[15px] transition-all outline-none font-bold"
              />
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-center mt-auto relative z-10">
              <button 
                onClick={handleAddUser}
                disabled={!newUserName.trim()}
                className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] disabled:bg-gray-300 disabled:shadow-none text-white py-4 rounded-full font-bold text-[16px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
              >
                登録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalUserId && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[360px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col items-center">
            <h2 className="text-[18px] font-bold text-gray-800 mb-4 tracking-wide text-center">
              招待コード
            </h2>
            <div className="text-[14px] text-gray-600 font-bold mb-8 text-center bg-[#F2F9F9] p-4 rounded-2xl w-full border border-[#3DB2D3]/20">
              {(() => {
                const targetUser = users.find(u => u.id === shareModalUserId);
                if (targetUser?.status === "共有済") return "※共有されています";
                if (targetUser?.invitationCode) return <span className="text-[18px] tracking-[0.15em] text-gray-800">{targetUser.invitationCode}</span>;
                return "コード未生成";
              })()}
            </div>
            <div className="flex flex-col gap-3 w-full mt-2">
              {users.find(u => u.id === shareModalUserId)?.status === "共有済" ? (
                <button 
                  onClick={() => {
                    setUsers(users.map(u => u.id === shareModalUserId ? { ...u, status: "保護者と共有" } : u));
                    setShareModalUserId(null);
                  }}
                  className="w-full bg-[#FF6B8B] text-white hover:bg-[#f1597a] py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(255,107,139,0.25)] transition-all active:scale-[0.98] tracking-wide flex items-center justify-center gap-2"
                >
                  解除する
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setUsers(users.map(u => u.id === shareModalUserId ? { ...u, status: "共有済" } : u));
                    setShareModalUserId(null);
                  }}
                  className="w-full bg-[#3DB2D3] text-white hover:bg-[#329ab8] py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide flex items-center justify-center gap-2"
                >
                  共有済み
                </button>
              )}
              <button 
                onClick={() => setShareModalUserId(null)}
                className="w-full bg-gray-100 text-gray-500 hover:bg-gray-200 py-3.5 rounded-full font-bold text-[15px] transition-all active:scale-[0.98] tracking-wide"
              >
                閉じる
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
    </div>
  );
}
