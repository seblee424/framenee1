function test(text) {
  const now = new Date();
  let date = new Date(now);
  let title = text;

  const datePatterns = [
    {match: /(?:今|这|本)天/, offset: 0},
    {match: /明天/, offset: 1},
    {match: /后天/, offset: 2},
    {match: /大后天/, offset: 3},
    {match: /昨天/, offset: -1},
    {match: /前天/, offset: -2},
  ];
  for (const p of datePatterns) { if (p.match.test(text)) { date.setDate(date.getDate() + p.offset); break; } }

  const cnMap = { '零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12 };
  function cnToNum(s) { return cnMap[s.replace(/\s/g,'')] ?? null; }
  function extractCnHour(text) {
    const m = text.match(/(?:凌晨|早上|早[上]?|上午|中午|下[午午]|晚[上]?|晚上)?([一二三四五六七八九十十一十二]+)[点时]/);
    if (!m) return null;
    return cnToNum(m[1]);
  }

  let hour = null, minute = 0;
  const colonMatch = text.match(/(\d+)[:：](\d+)/);
  const hourMatch = text.match(/(?:凌晨|早上|早[上]?|上午|中午|下[午午]|晚[上]?|晚上)?(\d+)[点时]/);
  const cnHour = extractCnHour(text);

  if (colonMatch) { hour = parseInt(colonMatch[1]); minute = parseInt(colonMatch[2]); if (/下[午午]|晚[上]?|晚上/.test(text) && hour < 12) hour += 12; }
  else if (hourMatch) {
    hour = parseInt(hourMatch[1]);
    if (/下[午午]|晚[上]?|晚上/.test(text) && hour < 12) hour += 12;
    if (!/凌晨|早上|上午|中午|下[午午]|晚[上]?|晚上/.test(text) && hour < 7) hour += 12;
  } else if (cnHour !== null) {
    hour = cnHour;
    if (/下[午午]|晚[上]?|晚上/.test(text) && hour < 12) hour += 12;
    if (!/凌晨|早上|上午|中午|下[午午]|晚[上]?|晚上/.test(text) && hour < 7) hour += 12;
  }

  if (hour !== null) {
    console.log(`${text} → ${hour}:${minute.toString().padStart(2,'0')} (local ${date.getHours()}:${date.getMinutes()})`);
    date.setHours(hour, minute, 0, 0);
  } else {
    console.log(`${text} → NO MATCH, default 9:00`);
    date.setHours(9, 0, 0, 0);
  }

  title = text.replace(/(?:今|这|本|明|后|大后|昨|前)天/g, '').replace(/周[一二三四五六日天]|星期[一二三四五六日天]/g, '').replace(/下(周|个|一)?周|下礼拜/g, '').replace(/(\d+)[月\/-](\d+)[日号]/g, '').replace(/(\d+)[日号]/g, '').replace(/(?:凌晨|早上|早[上]?|上午|中午|下[午午]|晚[上]?|晚上)?\d+[点时][:：]?\d*分?/g, '').replace(/\s+/g, ' ').trim();
  if (!title) title = text;
  console.log(`  title: "${title}"`);
  console.log(`  ISO: ${date.toISOString()}`);
}

test('下午三点吃饭');
test('晚上十一点睡觉');
test('明天上午十点开会');
test('后天下午五点半打球');
test('周五晚上八点看电影');
