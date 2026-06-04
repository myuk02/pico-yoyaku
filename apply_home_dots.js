const fs = require('fs');
const path = 'c:/Users/myukf/Desktop/riyou_yoyaku/src/app/staff/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update import
content = content.replace(
  'import { useState } from "react";',
  'import { useState, useEffect } from "react";'
);

// 2. Add state and effect hooks
const targetUsersBlock = `  const [users, setUsers] = useState([
    { id: 1, name: "田中 咲弥", pickupTime: "15:30", pickupPlace: "〇〇小学校", dropoffTime: "17:30", dropoffPlace: "自宅", isConfirmed: true },
    { id: 2, name: "岩田 湊人", pickupTime: "14:00", pickupPlace: "△△小学校", dropoffTime: "16:00", dropoffPlace: "自宅", isConfirmed: true },
    { id: 3, name: "小柳 苺果", pickupTime: "15:45", pickupPlace: "自宅", dropoffTime: "18:00", dropoffPlace: "自宅", isConfirmed: true },
    { id: 4, name: "野口 美雲", pickupTime: "14:30", pickupPlace: "□□小学校", dropoffTime: "16:30", dropoffPlace: "祖母宅", isConfirmed: true },
    { id: 5, name: "荒木 聡志", pickupTime: "15:00", pickupPlace: "〇〇小学校", dropoffTime: "17:00", dropoffPlace: "自宅", isConfirmed: true },
    { id: 6, name: "松本 南那", pickupTime: "15:30", pickupPlace: "△△小学校", dropoffTime: "17:30", dropoffPlace: "自宅", isConfirmed: true },
    { id: 7, name: "高田 心", pickupTime: "14:15", pickupPlace: "□□小学校", dropoffTime: "16:15", dropoffPlace: "自宅", isConfirmed: true },
    { id: 8, name: "大江 弘人", pickupTime: "16:00", pickupPlace: "自宅", dropoffTime: "18:00", dropoffPlace: "自宅", isConfirmed: true },
    { id: 9, name: "浅雛 華穂", pickupTime: "15:00", pickupPlace: "〇〇小学校", dropoffTime: "17:30", dropoffPlace: "自宅", isConfirmed: true },
  ]);`;

const addedHooks = `

  const [isClient, setIsClient] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<Record<number, 'red' | 'blue'>>({});
  
  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const newStatus: Record<number, 'red' | 'blue'> = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      newStatus[i] = 'blue';
    }
    
    users.forEach(user => {
      const stored = localStorage.getItem(\`pico_calendar_\${user.id}_\${year}_\${month}\`);
      if (stored) {
        try {
          const days = JSON.parse(stored);
          days.forEach((day: any) => {
            if (day.type === "scheduled" && day.status === "unconfirmed" && day.date) {
              newStatus[day.date] = 'red';
            }
          });
        } catch(e) {}
      }
    });
    setDailyStatus(newStatus);
  }, [currentMonth, isClient, users]);`;

content = content.replace(targetUsersBlock, targetUsersBlock + addedHooks);

// 3. Update the dot rendering logic
const oldDots = `                      <div className="h-2 mt-1">
                        {isMay2026 && [1, 2, 7, 8, 11, 12, 13, 14, 15, 18, 19, 21, 22, 25, 26, 27, 28, 29, 30].includes(dayNum) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3DB2D3]"></div>
                        )}
                        {isMay2026 && [9, 16, 20, 23].includes(dayNum) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B8B]"></div>
                        )}
                        {!isMay2026 && isCurrent && dayNum % 4 === 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3DB2D3]"></div>
                        )}
                        {!isMay2026 && isCurrent && dayNum % 7 === 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B8B]"></div>
                        )}
                      </div>`;

const newDots = `                      <div className="h-2 mt-1">
                        {isCurrent && dailyStatus[dayNum] === 'red' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B8B]"></div>
                        )}
                        {isCurrent && dailyStatus[dayNum] === 'blue' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3DB2D3]"></div>
                        )}
                      </div>`;

content = content.replace(oldDots, newDots);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
