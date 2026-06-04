const fs = require('fs');
const path = 'c:/Users/myukf/Desktop/riyou_yoyaku/src/app/staff/users/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update State
content = content.replace(
  'const [isShareModalOpen, setIsShareModalOpen] = useState(false);',
  'const [shareModalUserId, setShareModalUserId] = useState<number | null>(null);'
);

// 2. Update the button badge onClick
const oldButton = `                {/* Status Badge */}
                <div className="mt-1 pt-2 flex justify-center">
                  <div 
                    onClick={() => {
                      if (user.status === "保護者と共有") setIsShareModalOpen(true);
                    }}
                    className={\`w-[95%] mx-auto text-center font-bold px-1 py-1.5 rounded-full text-[11px] tracking-tight flex items-center justify-center gap-1.5 border \${
                    user.status === "共有済"
                      ? "bg-gray-50 text-gray-500 border-gray-300"
                      : "bg-[#F0F8FB] text-[#3DB2D3] border-[#3DB2D3]/40 cursor-pointer"
                  }\`}>`;

const newButton = `                {/* Status Badge */}
                <div className="mt-1 pt-2 flex justify-center">
                  <div 
                    onClick={() => setShareModalUserId(user.id)}
                    className={\`w-[95%] mx-auto text-center font-bold px-1 py-1.5 rounded-full text-[11px] tracking-tight flex items-center justify-center gap-1.5 border cursor-pointer \${
                    user.status === "共有済"
                      ? "bg-gray-50 text-gray-500 border-gray-300"
                      : "bg-[#F0F8FB] text-[#3DB2D3] border-[#3DB2D3]/40"
                  }\`}>`;

content = content.replace(oldButton, newButton);

// 3. Update the Modal
const oldModal = `      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[360px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col items-center">
            <h2 className="text-[18px] font-bold text-gray-800 mb-4 tracking-wide text-center">
              招待コード
            </h2>
            <div className="text-[14px] text-gray-600 font-bold mb-8 text-center bg-[#F2F9F9] p-4 rounded-2xl w-full border border-[#3DB2D3]/20">
              ※現在、連携システムの準備中です
            </div>
            <div className="flex flex-col gap-3 w-full mt-2">
              <button 
                className="w-full bg-[#3DB2D3] text-white py-3.5 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide flex items-center justify-center gap-2"
              >
                コピーする
              </button>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="w-full bg-gray-100 text-gray-500 hover:bg-gray-200 py-3.5 rounded-full font-bold text-[15px] transition-all active:scale-[0.98] tracking-wide"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}`;

const newModal = `      {/* Share Modal */}
      {shareModalUserId && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[360px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col items-center">
            <h2 className="text-[18px] font-bold text-gray-800 mb-4 tracking-wide text-center">
              招待コード
            </h2>
            <div className="text-[14px] text-gray-600 font-bold mb-8 text-center bg-[#F2F9F9] p-4 rounded-2xl w-full border border-[#3DB2D3]/20">
              {users.find(u => u.id === shareModalUserId)?.status === "共有済" 
                ? "※共有されています" 
                : "※現在、連携システムの準備中です"}
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
      )}`;

content = content.replace(oldModal, newModal);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
