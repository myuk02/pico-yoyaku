"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building, 
  Bell, 
  LayoutGrid, 
  LogOut, 
  Users, 
  Cloud, 
  X,
  Plus,
  Mail,
  Book,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { collection, getDocs, addDoc, query, where, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const FACILITY_MAP: Record<string, string> = {
  "葭津": "facility-1773884904073",
  "渡": "facility-1773884917420",
  "大篠津": "facility-1773884944675",
  "湯梨浜": "facility-1773884954458",
  "テスト用": "facility-1774355827269",
};

export default function Announcements() {
  const pathname = usePathname();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'individual'>('all');
  const [messageContent, setMessageContent] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<{id: string, name: string}[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isClient, setIsClient] = useState(false);
  const [showToast, setShowToast] = useState<{message: string, visible: boolean}>({message: "", visible: false});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fetchAnnouncements = async (facilityId: string) => {
    try {
      const q = query(collection(db, "announcements"), where("facilityId", "==", facilityId));
      const snap = await getDocs(q);
      const items = snap.docs.map(doc => {
        const data = doc.data();
        let targetStr = "全体";
        if (data.targetType === 'individual') {
          targetStr = data.targetNames && data.targetNames.length > 0 
            ? data.targetNames.join(" 様、") + " 様" 
            : "一部の利用者";
        }
        
        let datetimeStr = "たった今";
        if (data.createdAt?.toDate) {
           const d = data.createdAt.toDate();
           datetimeStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }

        const rawTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();

        return {
          id: doc.id,
          datetime: datetimeStr,
          target: targetStr,
          content: data.text,
          _time: rawTime
        };
      });
      items.sort((a, b) => b._time - a._time);
      setHistory(items);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    setIsClient(true);
    const fetchInitialData = async () => {
      const storedFacility = localStorage.getItem('pico_selected_facility') || "葭津";
      const facilityId = localStorage.getItem('pico_selected_facility_id') || FACILITY_MAP[storedFacility] || FACILITY_MAP["葭津"];
      setSelectedFacilityId(facilityId);

      try {
        const uq = query(collection(db, "children"), where("facilityId", "==", facilityId));
        const usnap = await getDocs(uq);
        setUsersList(usnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || "未設定" })));
      } catch (e) {}

      await fetchAnnouncements(facilityId);
    };
    fetchInitialData();
  }, []);

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) 
        ? prev.filter(uid => uid !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="flex h-screen text-gray-800 overflow-hidden" style={{ backgroundColor: '#ECF8FC' }}>
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
        {/* Background Usagi */}
        <div className="absolute bottom-0 left-10 w-full max-w-[1000px] flex justify-center pointer-events-none z-0">
          <img 
            src="/usagi_1.png" 
            alt="background usagi" 
            className="w-full max-w-[550px] object-contain drop-shadow-md opacity-90"
          />
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 pl-2 relative z-10 max-w-[1000px]">
          <h1 className="text-[24px] font-bold text-gray-800 tracking-wide">お知らせ</h1>
          
          {/* ちょうちょ画像（最前面、タイトルから少し右側のバランス良い位置） */}
          <div className="absolute left-[25%] -translate-x-1/2 -top-6 z-50 pointer-events-none">
            <img src="/chou_1.png" alt="chou" className="w-[140px] h-[140px] object-contain drop-shadow-md opacity-90" />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#3DB2D3] text-white hover:bg-[#329ab8] px-6 py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
          >
            <Plus size={18} strokeWidth={3} />
            新規メッセージ作成
          </button>
        </div>

        {/* History List */}
        <div className="flex flex-col gap-4 relative z-10 max-w-[1000px]">
          {history.map((item) => (
            <div key={item.id} className="bg-white rounded-[24px] p-6 shadow-sm border-[3px] border-[#B5E4F2]/30 flex flex-col gap-3 transition-all hover:shadow-md relative group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-bold text-gray-400 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">{item.datetime}</span>
                  <span className={`text-[13px] font-bold px-4 py-1.5 rounded-full border ${
                    item.target === '全体' 
                      ? 'bg-[#EBF7FA] text-[#3DB2D3] border-[#3DB2D3]/30' 
                      : 'bg-[#F0F9EC] text-[#5A9E66] border-[#D1EAC8]'
                  }`}>
                    宛先：{item.target}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setItemToDelete(item);
                    setDeleteConfirmOpen(true);
                  }}
                  className="w-9 h-9 rounded-full hover:bg-[#FFF0F3] text-gray-300 hover:text-[#FF6B8B] flex items-center justify-center transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <p className="text-[15px] text-gray-700 font-bold leading-relaxed px-1 mt-1">{item.content}</p>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center text-gray-400 font-bold py-20 bg-white rounded-[24px] border-[3px] border-[#B5E4F2]/30">
              まだお知らせの履歴はありません
            </div>
          )}
        </div>
      </main>

      {/* New Message Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[500px] rounded-[32px] border-[4px] border-[#B5E4F2] p-8 relative shadow-2xl flex flex-col">
            <h2 className="text-[20px] font-bold text-gray-800 mb-8 tracking-wide flex items-center gap-2">
              <Mail className="text-[#3DB2D3]" size={24} strokeWidth={2.5} />
              新規メッセージ作成
            </h2>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            {/* Target Selection */}
            <div className="flex flex-col gap-4 mb-6">
              <label className="text-[15px] font-bold text-gray-700">宛先</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${targetType === 'all' ? 'border-[#3DB2D3]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                    {targetType === 'all' && <div className="w-2.5 h-2.5 bg-[#3DB2D3] rounded-full"></div>}
                  </div>
                  <span className={`text-[15px] font-bold transition-colors ${targetType === 'all' ? 'text-[#3DB2D3]' : 'text-gray-600'}`}>全員に送る（全体）</span>
                  <input type="radio" className="hidden" checked={targetType === 'all'} onChange={() => setTargetType('all')} />
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${targetType === 'individual' ? 'border-[#3DB2D3]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                    {targetType === 'individual' && <div className="w-2.5 h-2.5 bg-[#3DB2D3] rounded-full"></div>}
                  </div>
                  <span className={`text-[15px] font-bold transition-colors ${targetType === 'individual' ? 'text-[#3DB2D3]' : 'text-gray-600'}`}>個別に選ぶ</span>
                  <input type="radio" className="hidden" checked={targetType === 'individual'} onChange={() => setTargetType('individual')} />
                </label>
              </div>

              {/* Individual Select Area */}
              {targetType === 'individual' && (
                <div className="mt-2 max-h-40 overflow-y-auto border-2 border-[#B5E4F2]/50 rounded-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200" style={{ backgroundColor: '#ECF8FC' }}>
                  {usersList.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                        selectedUsers.includes(u.id) ? 'bg-[#3DB2D3] border-[#3DB2D3]' : 'bg-white border-gray-300 group-hover:border-[#3DB2D3]'
                      }`}>
                        {selectedUsers.includes(u.id) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-[14px] font-bold text-gray-700">{u.name} 様</span>
                      <input type="checkbox" className="hidden" checked={selectedUsers.includes(u.id)} onChange={() => toggleUser(u.id)} />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex flex-col gap-3 mb-8 relative">
              <label className="text-[15px] font-bold text-gray-700">メッセージ本文</label>
              <textarea 
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="w-full bg-white border-2 border-gray-200 focus:border-[#3DB2D3] rounded-[20px] p-5 text-gray-800 text-[15px] transition-all outline-none font-bold resize-none min-h-[160px]"
                placeholder="保護者へのお知らせを入力してください"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button 
                disabled={isSubmitting || !messageContent.trim() || (targetType === 'individual' && selectedUsers.length === 0)}
                onClick={async () => {
                   setIsSubmitting(true);
                   try {
                     const selectedNames = usersList.filter(u => selectedUsers.includes(u.id)).map(u => u.name);
                     
                     await addDoc(collection(db, "announcements"), {
                       text: messageContent.trim(),
                       targetType: targetType,
                       targetUserIds: targetType === 'individual' ? selectedUsers : [],
                       targetNames: targetType === 'individual' ? selectedNames : [],
                       facilityId: selectedFacilityId,
                       createdAt: serverTimestamp()
                     });

                     await fetchAnnouncements(selectedFacilityId);
                     
                     setIsModalOpen(false);
                     setMessageContent('');
                     setTargetType('all');
                     setSelectedUsers([]);
                     
                     setShowToast({ message: "お知らせを投稿しました", visible: true });
                     setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
                   } catch (e) {
                     console.error("Error saving announcement", e);
                   }
                   setIsSubmitting(false);
                }}
                className="w-full bg-[#3DB2D3] hover:bg-[#329ab8] disabled:bg-gray-300 disabled:shadow-none text-white py-4 rounded-full font-bold text-[16px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide"
              >
                {isSubmitting ? "送信中..." : "投稿する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[360px] rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-[#FFF0F3] rounded-full flex items-center justify-center mb-5">
              <Trash2 className="text-[#FF6B8B]" size={26} strokeWidth={2.5} />
            </div>
            <h2 className="text-[17px] font-bold text-gray-800 mb-3 leading-relaxed">
              このお知らせを削除しますか？
            </h2>
            <p className="text-[14px] text-gray-500 font-bold mb-8">
              ※保護者アプリ側からも即座に削除されます
            </p>
            <div className="flex w-full gap-3">
              <button 
                disabled={isDeleting}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3.5 rounded-full font-bold text-[15px] transition-all"
              >
                キャンセル
              </button>
              <button 
                disabled={isDeleting}
                onClick={async () => {
                  if (!itemToDelete) return;
                  setIsDeleting(true);
                  try {
                    await deleteDoc(doc(db, "announcements", itemToDelete.id));
                    await fetchAnnouncements(selectedFacilityId);
                    setShowToast({ message: "お知らせを削除しました", visible: true });
                    setTimeout(() => setShowToast({ message: "", visible: false }), 3000);
                  } catch (e) {
                    console.error(e);
                  }
                  setIsDeleting(false);
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                }}
                className="flex-1 bg-[#FF6B8B] hover:bg-[#f1597a] text-white py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(255,107,139,0.25)] transition-all"
              >
                {isDeleting ? "削除中..." : "削除する"}
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
              <button 
                onClick={() => {
                  setIsContactModalOpen(false);
                  window.location.href = "https://pico-app--studio-4866279312-20f76.asia-east1.hosted.app";
                }}
                className="flex-1 bg-[#3DB2D3] hover:bg-[#329ab8] text-white py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all flex items-center justify-center"
              >
                OK（進む）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
