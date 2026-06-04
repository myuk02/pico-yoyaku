const fs = require('fs');
const path = 'c:/Users/myukf/Desktop/riyou_yoyaku/src/app/staff/calendar/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add isClient
content = content.replace(
  'const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1));',
  'const [isClient, setIsClient] = useState(false);\n  React.useEffect(() => setIsClient(true), []);\n\n  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1));'
);

// 2. Add the sync hooks and remove the manual generation in handleNext/Prev
content = content.replace(
  `  const handlePrevMonth = () => {\n    setCurrentDate(prev => {\n      const nextDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);\n      setCalendarDaysState(generateCalendarForMonth(nextDate.getFullYear(), nextDate.getMonth()));\n      return nextDate;\n    });\n  };`,
  `  const handlePrevMonth = () => {\n    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));\n  };`
);

content = content.replace(
  `  const handleNextMonth = () => {\n    setCurrentDate(prev => {\n      const nextDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);\n      setCalendarDaysState(generateCalendarForMonth(nextDate.getFullYear(), nextDate.getMonth()));\n      return nextDate;\n    });\n  };`,
  `  const handleNextMonth = () => {\n    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));\n  };\n\n  React.useEffect(() => {\n    if (isClient) {\n      const stored = localStorage.getItem(\`pico_calendar_\${currentUser.id}_\${currentDate.getFullYear()}_\${currentDate.getMonth()}\`);\n      if (stored) {\n        setCalendarDaysState(JSON.parse(stored));\n      } else {\n        setCalendarDaysState(generateCalendarForMonth(currentDate.getFullYear(), currentDate.getMonth()));\n      }\n    }\n  }, [currentDate, currentUser.id, isClient]);\n\n  React.useEffect(() => {\n    if (isClient) {\n      localStorage.setItem(\`pico_calendar_\${currentUser.id}_\${currentDate.getFullYear()}_\${currentDate.getMonth()}\`, JSON.stringify(calendarDaysState));\n    }\n  }, [calendarDaysState, isClient, currentUser.id, currentDate]);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
