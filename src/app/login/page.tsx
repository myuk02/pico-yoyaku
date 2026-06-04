"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn, Cloud } from "lucide-react";
import { collection, query, where, getDocs, getDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 既にログインしている場合は /staff へリダイレクト
    const isAuth = document.cookie.includes("__session=true");
    if (isAuth) {
      router.replace("/staff");
    } else {
      setIsAuthChecking(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setIsLoading(true);
    setError("");

    try {
      let isValid = false;
      const globalDocRef = doc(db, "settings", "global");
      const globalDocSnap = await getDoc(globalDocRef);

      if (!globalDocSnap.exists()) {
        // 設定ドキュメントが存在しない場合は初期作成する
        await setDoc(globalDocRef, { loginPassword: "831001" });
        if (password === "831001") {
          isValid = true;
        }
      } else {
        if (globalDocSnap.data().loginPassword === password) {
          isValid = true;
        }
      }

      // 厳密な判定を通過した場合のみログインを許可
      if (isValid) {
        // ログイン成功：クッキーに認証情報をセット（30日間有効）
        const d = new Date();
        d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
        document.cookie = `__session=true; expires=${d.toUTCString()}; path=/`;

        // スタッフ画面へ遷移
        router.push("/staff");
      } else {
        setError("※認証エラーが発生しました。パスワードをご確認ください");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("※通信エラーが発生しました。しばらく経ってから再度お試しください");
      setIsLoading(false);
    }
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[#ECF8FC]" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ECF8FC] relative overflow-hidden">
      
      {/* 雲の装飾（背景） */}
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <Cloud className="absolute top-[15%] right-[15%] w-[200px] h-[200px] text-[#3DB2D3] opacity-[0.04]" strokeWidth={0.5} />
        <Cloud className="absolute bottom-[20%] left-[10%] w-[150px] h-[150px] text-[#3DB2D3] opacity-[0.04]" strokeWidth={0.5} />
        <Cloud className="absolute top-[50%] right-[30%] w-[100px] h-[100px] text-[#3DB2D3] opacity-[0.04]" strokeWidth={0.5} />
      </div>

      <div className="w-full max-w-[400px] relative z-10 px-4">
        
        {/* うさぎのキャラクター（ひょっこり） */}
        <div className="absolute -top-[70px] left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
          <img 
            src="/usagi_6.png" 
            alt="Pico Rabbit" 
            className="w-[120px] h-auto object-contain"
          />
        </div>

        {/* ログインカード（ガラス細工風） */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border-[4px] border-[#a1ddf0]/30 p-10 pt-16 shadow-[0_20px_40px_rgba(61,178,211,0.1)] relative z-10">
          
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <img src="/pick_icon.png" alt="Pico Logo" className="w-8 h-8 object-contain brightness-95 contrast-110" />
              <span className="text-[24px] font-black tracking-widest text-gray-800">Pico!</span>
            </div>
            <span className="text-[12px] font-bold text-[#3DB2D3] tracking-wider">施設管理システム</span>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-[13px] font-bold text-gray-500 mb-2 block ml-1">
                パスワードを入力してください
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-300" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                  className="w-full bg-gray-50/50 border-2 border-gray-100 focus:border-[#3DB2D3] rounded-2xl pl-11 pr-4 py-3.5 text-gray-800 text-[20px] tracking-[0.3em] font-bold transition-all outline-none text-center"
                  required
                />
              </div>
              {error && (
                <p className="text-[#FF6B8B] text-[12px] font-bold mt-2 ml-1 animate-in slide-in-from-top-1">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || password.length === 0}
              className="w-full mt-2 bg-[#3DB2D3] hover:bg-[#329ab8] disabled:bg-gray-200 disabled:shadow-none text-white py-4 rounded-full font-bold text-[16px] shadow-[0_4px_12px_rgba(61,178,211,0.25)] transition-all active:scale-[0.98] tracking-wide flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} strokeWidth={2.5} />
                  ログイン
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
