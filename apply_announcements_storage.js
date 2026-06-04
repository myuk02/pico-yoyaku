const fs = require('fs');
const path = 'c:/Users/myukf/Desktop/riyou_yoyaku/src/app/staff/announcements/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetHistory = `  // Mock data for history
  const [history, setHistory] = useState([
    { id: 1, datetime: "2026/05/22 14:30", target: "全体", content: "明日から施設の改装工事が始まります。ご送迎の際は裏口をご利用ください。" },
    { id: 2, datetime: "2026/05/18 09:15", target: "全体", content: "5月のお誕生日会のお写真をアプリにアップロードしました！ぜひご確認ください。" },
    { id: 3, datetime: "2026/05/10 16:40", target: "佐藤 様", content: "本日のお着替えセットのお忘れ物がございました。次回ご来所時にお渡しいたします。" },
  ]);`;

const newHistory = `  // Mock data for history
  const [history, setHistory] = useState([
    { id: 1, datetime: "2026/05/22 14:30", target: "全体", content: "明日から施設の改装工事が始まります。ご送迎の際は裏口をご利用ください。" },
    { id: 2, datetime: "2026/05/18 09:15", target: "全体", content: "5月のお誕生日会のお写真をアプリにアップロードしました！ぜひご確認ください。" },
    { id: 3, datetime: "2026/05/10 16:40", target: "佐藤 様", content: "本日のお着替えセットのお忘れ物がございました。次回ご来所時にお渡しいたします。" },
  ]);

  const [isClient, setIsClient] = useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('pico_announcements');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  React.useEffect(() => {
    if (isClient) {
      localStorage.setItem('pico_announcements', JSON.stringify(history));
    }
  }, [history, isClient]);`;

content = content.replace(targetHistory, newHistory);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
