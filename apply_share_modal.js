const fs = require('fs');
const path = 'c:/Users/myukf/Desktop/riyou_yoyaku/src/app/staff/users/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state
const targetState = `  const [isInputModalOpen, setIsInputModalOpen] = useState(false);`;
const newState = `  const [isShareModalOpen, setIsShareModalOpen] = useState(false);\n  const [isInputModalOpen, setIsInputModalOpen] = useState(false);`;
content = content.replace(targetState, newState);

// 2. Add onClick to button
const targetButton = `                {/* Status Badge */}
                <div className="mt-1 pt-2 flex justify-center">
                  <div className={\`w-[95%] mx-auto text-center font-bold px-1 py-1.5 rounded-full text-[11px] tracking-tight flex items-center justify-center gap-1.5 border \${
                    user.status === "共有済"
                      ? "bg-gray-50 text-gray-500 border-gray-300"
                      : "bg-[#F0F8FB] text-[#3DB2D3] border-[#3DB2D3]/40"
                  }\`}>`;
const newButton = `                {/* Status Badge */}
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
content = content.replace(targetButton, newButton);

// 3. Add modal
const targetEnd = `    </div>
  );
}`;
const newEnd = `      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[360px] rounded-[32px] border-[4px] border-[#a1ddf0] p-8 relative shadow-2xl flex flex-col items-center">
            <h2 className="text-[18px] font-bold text-gray-800 mb-4 tracking-wide text-center">
              保護者と共有
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
      )}

    </div>
  );
}`;
content = content.replace(targetEnd, newEnd);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
