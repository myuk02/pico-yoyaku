"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, CheckCircle2, AlertTriangle } from "lucide-react";

function SSOReceiverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");

  useEffect(() => {
    // 擬似的な検証通信をシミュレート
    const verifyToken = async () => {
      // 1.5秒のローディング時間を演出
      await new Promise(resolve => setTimeout(resolve, 1500));

      // トークンが存在しない、または「error」という文字列の場合はエラーとする
      if (!token || token === "error") {
        setStatus("error");
        return;
      }

      // 成功した場合
      setStatus("success");
      
      // Cookieに保護者用セッションをセット（30日間有効）
      const d = new Date();
      d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
      document.cookie = `pico_parent_auth=true; expires=${d.toUTCString()}; path=/`;

      // さらに0.5秒後に親画面へ遷移
      setTimeout(() => {
        router.push("/");
      }, 500);
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="w-full max-w-[400px] relative z-10">
      {/* うさぎのキャラクター（ひょっこり） */}
      <div className="absolute -top-[70px] left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
        <img 
          src="/usagi_6.png" 
          alt="Pico Rabbit" 
          className="w-[120px] h-auto object-contain"
        />
      </div>

      {/* メインカード */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border-[4px] border-[#a1ddf0]/30 p-10 pt-16 shadow-[0_20px_40px_rgba(61,178,211,0.1)] relative z-10 flex flex-col items-center text-center min-h-[260px]">
        
        <div className="flex items-center gap-2 mb-8">
          <img src="/pick_icon.png" alt="Pico Logo" className="w-8 h-8 object-contain brightness-95 contrast-110" />
          <span className="text-[24px] font-black tracking-widest text-gray-800">Pico!</span>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-5 animate-in fade-in duration-500 mt-2">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 border-4 border-[#3DB2D3]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#3DB2D3] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[15px] font-bold text-[#3DB2D3] tracking-[0.2em] ml-1">
              loading<span className="animate-pulse">...</span>
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300 mt-2">
            <div className="w-14 h-14 bg-[#E8F8F5] rounded-full flex items-center justify-center text-[#1ABC9C]">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <p className="text-[16px] font-bold text-[#1ABC9C] tracking-wide mt-1">
              認証に成功しました
            </p>
            <p className="text-[13px] font-bold text-gray-400">
              ホーム画面へ移動します...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="w-14 h-14 bg-[#FFF0F3] rounded-full flex items-center justify-center text-[#FF6B8B]">
              <AlertTriangle size={28} strokeWidth={2.5} />
            </div>
            <p className="text-[13px] font-bold text-gray-700 leading-relaxed mt-2">
              リンクの有効期限が切れています。<br/>
              Pico！連絡帳からもう一度開き直してください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SSOReceiverPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ECF8FC] relative overflow-hidden px-4">
      {/* 雲の装飾（背景） */}
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <Cloud className="absolute top-[15%] right-[15%] w-[200px] h-[200px] text-[#3DB2D3] opacity-[0.04]" strokeWidth={0.5} />
        <Cloud className="absolute bottom-[20%] left-[10%] w-[150px] h-[150px] text-[#3DB2D3] opacity-[0.04]" strokeWidth={0.5} />
        <Cloud className="absolute top-[50%] right-[30%] w-[100px] h-[100px] text-[#3DB2D3] opacity-[0.04]" strokeWidth={0.5} />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-[400px] relative z-10 flex justify-center">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 border-4 border-[#3DB2D3]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#3DB2D3] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      }>
        <SSOReceiverContent />
      </Suspense>
    </div>
  );
}
