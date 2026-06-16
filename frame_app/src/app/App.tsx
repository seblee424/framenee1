import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Image, Trophy, Cloud, Mic, User, Users, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarDetailPage } from './components/CalendarDetailPage';
import { PhotoDetailPage } from './components/PhotoDetailPage';
import { TodoDetailPage } from './components/TodoDetailPage';
import { RewardsDetailPage } from './components/RewardsDetailPage';
import { AccountManagement } from './components/AccountManagement';
import { VoiceInput } from './components/VoiceInput';
import { LoginPage } from './components/LoginPage';
import { ProfilePanel } from './components/ProfilePanel';
import { LocationPermission, getSavedTimezone } from './components/LocationPermission';
import { AppProvider, useAppContext } from './context/AppContext';
import { webEventsApi } from '@/services/frameNe/webEvents';
import type { CompletedSummaryItem } from '@/services/frameNe/webEvents';

type ModuleType = 'calendar' | 'photos' | 'accounts' | 'rewards' | null;

function AppContent() {
  const { familyMembers, photos, isLoading, reloadData, calendarEvents } = useAppContext();

  const [accounts, setAccounts] = useState<Array<{id: string; email: string; name: string}>>([]);
  const [completedSummary, setCompletedSummary] = useState<CompletedSummaryItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleType>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(() => {
    try { return !!localStorage.getItem('framene.permissions'); }
    catch { return false; }
  });

  const photoUrls = photos.map(p => p.url);
  const hasPhotos = photoUrls.length > 0;
  const safePhotoIndex = hasPhotos ? currentPhotoIndex % photoUrls.length : 0;
  const familyRanking = [...familyMembers].sort((a, b) => b.points - a.points).slice(0, 3);

  const weather = {
    temp: 22,
    condition: '多云',
    icon: Cloud,
    high: 26,
    low: 18,
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    const photoTimer = hasPhotos
      ? setInterval(() => {
          setCurrentPhotoIndex((prev) => (prev + 1) % photoUrls.length);
        }, 4000)
      : undefined;

    return () => {
      clearInterval(timer);
      if (photoTimer) clearInterval(photoTimer);
    };
  }, [hasPhotos, photoUrls.length]);

  // 加载已完成日程汇总
  useEffect(() => {
    webEventsApi.getCompletedSummary().then(r => setCompletedSummary(r.items)).catch(() => {});
  }, []);

  const handleModuleClick = (moduleId: ModuleType) => {
    setSelectedModule(moduleId);
  };

  const handleClose = () => {
    setSelectedModule(null);
  };

  const handleLoginSuccess = () => {
    reloadData();
    // 加载设备账号列表
    import('@/services/frameNe/webAccounts').then(m =>
      m.webAccountsApi.list().then(r => setAccounts(r.items)).catch(() => {})
    );
  };

  // PIN 解锁前显示登录页
  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <>
      <LocationPermission onComplete={() => setPermissionsReady(true)} />
      {permissionsReady && (
        <div className="size-full bg-black flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-[177.78vh] h-full max-h-[56.25vw] relative overflow-hidden">
        {/* 动态波浪背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200">
          <svg className="absolute bottom-0 w-full h-2/5" preserveAspectRatio="none" viewBox="0 0 1440 320">
            {/* 波浪层 1 */}
            <motion.path
              fill="url(#wave-gradient-1)"
              fillOpacity="0.2"
              d="M0,160L60,165.3C120,171,240,181,360,186.7C480,192,600,192,720,181.3C840,171,960,149,1080,154.7C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              animate={{
                d: [
                  "M0,160L60,165.3C120,171,240,181,360,186.7C480,192,600,192,720,181.3C840,171,960,149,1080,154.7C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,192L60,197.3C120,203,240,213,360,218.7C480,224,600,224,720,213.3C840,203,960,181,1080,186.7C1200,192,1320,224,1380,240L1440,256L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,128L60,133.3C120,139,240,149,360,154.7C480,160,600,160,720,149.3C840,139,960,117,1080,122.7C1200,128,1320,160,1380,176L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,160L60,165.3C120,171,240,181,360,186.7C480,192,600,192,720,181.3C840,171,960,149,1080,154.7C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                ],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: [0.45, 0.05, 0.55, 0.95],
                repeatType: "reverse",
              }}
              style={{ filter: 'blur(30px)' }}
            />
            <defs>
              <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <AnimatePresence mode="wait">
          {selectedModule === null ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="size-full px-8 py-4 flex flex-col relative z-10"
            >
              {/* 顶部：标题 + 天气 */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <motion.h1
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-0.5 text-2xl"
                  >
                    FrameNe 智能相框
                  </motion.h1>
                  <motion.p
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground text-xs"
                  >
                    {format(currentDate, 'EEEE, MMMM d, yyyy', { locale: zhCN })}
                  </motion.p>
                </div>

                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-2"
                >
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
                    <weather.icon className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-xl leading-none">{weather.temp}°C</div>
                      <div className="text-muted-foreground text-[10px]">{weather.condition}</div>
                      <div className="text-muted-foreground text-[9px]">最高 {weather.high}° 最低 {weather.low}°</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowProfile(true)}
                    className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 hover:bg-white transition-colors"
                    title="个人中心"
                  >
                    <User className="w-5 h-5 text-blue-500" />
                  </motion.button>
                </motion.div>
              </div>

              {/* 2x2 模块卡片网格 */}
              <div className="flex-1 grid grid-cols-2 auto-rows-fr gap-3 w-full min-h-0">
                {/* 日历 */}
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModuleClick('calendar')}
                  className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="relative p-3 h-full flex flex-col text-center">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm">日程日历</h3>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="text-4xl leading-none mb-1">{format(currentDate, 'd')}</div>
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {format(currentDate, 'EEEE', { locale: zhCN })}
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-2">
                        {format(currentDate, 'MMMM yyyy', { locale: zhCN })}
                      </div>
                      {calendarEvents.length > 0 && (
                        <div className="w-full space-y-1">
                          {calendarEvents.slice(0, 3).map((event, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                              <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                              <span className="text-left truncate">{event.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>

                {/* 相册 */}
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModuleClick('photos')}
                  className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="relative p-3 h-full flex flex-col">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Image className="w-4 h-4 text-purple-500" />
                      <h3 className="text-sm">家庭相册</h3>
                    </div>
                    <div className="flex-1 rounded-lg overflow-hidden bg-muted relative min-h-0">
                      {hasPhotos ? (
                        <>
                          <motion.img
                            key={currentPhotoIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1 }}
                            src={photoUrls[safePhotoIndex]}
                            alt="家庭照片"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded-full text-[9px]">
                            {safePhotoIndex + 1} / {photoUrls.length}
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
                          {isLoading ? '加载中...' : '暂无照片'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>

                {/* 设备账号 */}
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 20 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModuleClick('accounts')}
                  className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="relative p-3 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm">设备账号</h3>
                      </div>
                      {accounts.length > 0 && (
                        <div className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px]">
                          {accounts.length} 个账号
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 text-left overflow-hidden">
                      {accounts.map((acc, idx) => (
                        <div key={idx} className="p-2 bg-muted rounded-md">
                          <div className="flex items-start gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium truncate">{acc.name}</div>
                              <div className="text-[9px] text-muted-foreground truncate">{acc.email}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {accounts.length === 0 && (
                        <div className="text-[10px] text-muted-foreground text-center py-4">
                          暂无关联账号
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>

                {/* 用户日程记录 */}
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 20 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModuleClick('rewards')}
                  className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="relative p-3 h-full flex flex-col">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckSquare className="w-4 h-4 text-green-500" />
                      <h3 className="text-sm">日程记录</h3>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {completedSummary.length > 0 ? (
                        <div className="space-y-1.5 text-left">
                          {completedSummary.slice(0, 3).map((item, idx) => {
                            const name = item.source_email.split('@')[0] || item.source_email;
                            return (
                              <div key={idx} className="flex items-center justify-between p-1.5 bg-green-50 rounded-md">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                       style={{ backgroundColor: ['#3b82f6','#10b981','#f59e0b'][idx] }}>
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-[11px] truncate">{name}</span>
                                </div>
                                <span className="text-green-600 text-[10px] flex-shrink-0">{item.total_completed} 项</span>
                              </div>
                            );
                          })}
                          {completedSummary.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center pt-1">
                              +{completedSummary.length - 3} 位更多
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground text-center py-4">
                          暂无完成记录
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* 语音录入按钮 */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                {showVoiceInput ? (
                  <VoiceInput onRequireLogin={() => setShowProfile(true)} onCreated={() => reloadData()} />
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowVoiceInput(true)}
                    className="w-full mt-2 py-3 bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Mic className="w-5 h-5" />
                    <span>语音录入日程</span>
                  </motion.button>
                )}
              </motion.div>

              {/* 个人中心面板 */}
              <ProfilePanel
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
                onLoginSuccess={handleLoginSuccess}
              />
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="size-full"
            >
              {selectedModule === 'calendar' && <CalendarDetailPage onClose={handleClose} />}
              {selectedModule === 'photos' && <PhotoDetailPage onClose={handleClose} />}
              {selectedModule === 'accounts' && (
                <AccountManagement
                  onClose={handleClose}
                  onAccountChanged={() => {
                    import('@/services/frameNe/webAccounts').then(m =>
                      m.webAccountsApi.list().then(r => setAccounts(r.items)).catch(() => {})
                    );
                  }}
                />
              )}
              {selectedModule === 'rewards' && <RewardsDetailPage onClose={handleClose} />}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
