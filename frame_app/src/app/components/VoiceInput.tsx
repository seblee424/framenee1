import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Send, Sparkles, Check, X, Loader2, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { eventsApi } from '@/services/frameNe/calendar';
import { authService } from '@/services/authService';
import { getSavedTimezone } from './LocationPermission';

interface ParsedEvent {
  title: string;
  startAt: string;
  endAt: string;
  description?: string;
}

interface VoiceInputProps {
  onRequireLogin?: () => void;
  onCreated?: () => void;
}

export function VoiceInput({ onRequireLogin, onCreated }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const isLoggedIn = !!authService.getToken();

  const startRecording = useCallback(() => {
    setError('');
    setTranscript('');
    setParsedEvents([]);
    setShowResult(false);

    if (!SpeechRecognition) {
      setError('您的浏览器不支持语音识别，请使用 Chrome 浏览器，或直接在输入框打字');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) {
        setTranscript(prev => prev + finalText);
      } else if (interimText) {
        setTranscript(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        setError('麦克风权限被拒绝。请在 Chrome 地址栏左侧 🔒 或 🔐 图标中开启麦克风权限，然后刷新页面重试');
      } else if (event.error === 'no-speech') {
        setError('没有检测到语音，请重试');
      } else {
        setError(`语音识别出错: ${event.error}。请直接在输入框打字`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [SpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleParse = async () => {
    if (!transcript.trim()) return;

    setIsParsing(true);
    setError('');

    try {
      // 先尝试后端 AI 解析（DeepSeek），传入用户时区
      const tz = getSavedTimezone();
      const offset = new Date().getTimezoneOffset() * -1; // 转为 UTC+ 分钟
      const aiResult = await eventsApi.parseVoice(transcript, tz, offset);
      if (aiResult.source === 'ai' && aiResult.items.length > 0) {
        setParsedEvents(aiResult.items);
        setIsParsing(false);
        return;
      }

      // AI 解析不可用或失败，用前端正则降级
      const events = parseBasicEvents(transcript);

      if (events.length > 0) {
        setParsedEvents(events);
      } else {
        setError('未能识别出日程信息。请试试说 "明天下午3点开会" 或 "后天上午10点看医生"');
      }
    } catch (err: any) {
      setError(err.message || '解析失败');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCreateEvents = async () => {
    if (parsedEvents.length === 0) return;

    const token = authService.getToken();
    if (!token) {
      setError('请先在右上角「个人中心」登录后，才能创建日程');
      onRequireLogin?.();
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const user = authService.getSavedUser();
      await eventsApi.webVoiceCreate({
        items: parsedEvents.map(e => ({
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt,
          description: e.description,
        })),
        sourceEmail: user?.email || undefined,
      });
      setShowResult(true);
      onCreated?.();
      setTimeout(() => {
        setTranscript('');
        setParsedEvents([]);
        setShowResult(false);
      }, 2000);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('未登录') || err.message?.includes('未认证')) {
        setError('请先在「个人中心」登录后再创建日程');
        onRequireLogin?.();
      } else {
        setError(err.message || '创建日程失败');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTranscript('');
    setParsedEvents([]);
    setShowResult(false);
    setError('');
  };

  return (
    <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-border">
      <AnimatePresence mode="wait">
        {showResult ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-green-600"
          >
            <Check className="w-5 h-5" />
            <span>解析录入成功</span>
          </motion.div>
        ) : parsedEvents.length > 0 ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>已识别 {parsedEvents.length} 个日程</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-auto">
              {parsedEvents.map((event, i) => (
                <div key={i} className="p-2 bg-blue-50 rounded-lg text-xs">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-muted-foreground">
                    {new Date(event.startAt).toLocaleString('zh-CN', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {' → '}
                    {new Date(event.endAt).toLocaleString('zh-CN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!isLoggedIn && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <LogIn className="w-3 h-3" />
                点击确认前，请先在右上角「个人中心」登录以同步到云端
              </p>
            )}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateEvents}
                disabled={isCreating}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Check className="w-4 h-4" /> 确认创建</>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-100 text-muted-foreground rounded-lg text-sm"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full flex-shrink-0 transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </motion.button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder={
                  isRecording ? '正在聆听...' : '点击🎤说话，或直接输入日程描述'
                }
                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm border border-border focus:outline-none focus:border-blue-400"
                onKeyDown={e => e.key === 'Enter' && handleParse()}
              />
              {transcript.trim() && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={handleParse}
                  disabled={isParsing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                >
                  {isParsing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 text-xs mt-2 text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

/** 中文日程自然语言解析（来自 voice-parser.js） */
function parseBasicEvents(text: string): ParsedEvent[] {
  const now = new Date();
  let date = new Date(now);
  let title = text;

  // 日期关键词
  const datePatterns = [
    { match: /(?:今|这|本)天/, offset: 0 },
    { match: /明天/, offset: 1 },
    { match: /后天/, offset: 2 },
    { match: /大后天/, offset: 3 },
    { match: /昨天/, offset: -1 },
    { match: /前天/, offset: -2 },
  ];

  for (const p of datePatterns) {
    if (p.match.test(text)) {
      date.setDate(date.getDate() + p.offset);
      break;
    }
  }

  // 周几 / 星期几
  const weekMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
  const weekMatch = text.match(/周([一二三四五六日天])|星期([一二三四五六日天])/);
  if (weekMatch) {
    const target = weekMap[weekMatch[1] || weekMatch[2]] || 0;
    if (target > 0) {
      let diff = target - (date.getDay() || 7);
      if (diff <= 0) diff += 7;
      date.setDate(date.getDate() + diff);
    }
  }

  // 下周/下个周/下礼拜
  if (/下(周|个|一)?周|下礼拜/.test(text)) {
    date.setDate(date.getDate() + 7);
  }

  // 月日
  const monthDayMatch = text.match(/(\d+)[月\/-](\d+)[日号]/);
  if (monthDayMatch) {
    date.setMonth(parseInt(monthDayMatch[1]) - 1, parseInt(monthDayMatch[2]));
  } else {
    const dayMatch = text.match(/(\d+)[日号]/);
    if (dayMatch && !/(\d+)[月\/-](\d+)[日号]/.test(text)) {
      date.setDate(parseInt(dayMatch[1]));
    }
  }

  // 时间
  // 中文数字转阿拉伯数字
  const cnMap: Record<string, number> = { '零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12 };
  function cnToNum(s: string): number | null { return cnMap[s.replace(/\s/g, '')] ?? null; }
  function extractCnHour(text: string): number | null {
    const m = text.match(/(?:凌晨|早上|早[上]?|上午|中午|下[午午]|晚[上]?|晚上)?([一二三四五六七八九十十一十二]+)[点时]/);
    if (!m) return null;
    return cnToNum(m[1]);
  }

  let hour: number | null = null, minute = 0;
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
    date.setHours(hour, minute, 0, 0);
  } else {
    date.setHours(9, 0, 0, 0);
  }

  // 标题（去掉时间日期关键词）
  title = text
    .replace(/(?:今|这|本|明|后|大后|昨|前)天/g, '')
    .replace(/周[一二三四五六日天]|星期[一二三四五六日天]/g, '')
    .replace(/下(周|个|一)?周|下礼拜/g, '')
    .replace(/(\d+)[月\/-](\d+)[日号]/g, '')
    .replace(/(\d+)[日号]/g, '')
    .replace(/(?:凌晨|早上|早[上]?|上午|中午|下[午午]|晚[上]?|晚上)?\d+[点时][:：]?\d*分?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) title = text;

  // 结束时间默认30分钟
  const endDate = new Date(date.getTime() + 30 * 60 * 1000);

  return [{
    title,
    startAt: date.toISOString(),
    endAt: endDate.toISOString(),
  }];
}
