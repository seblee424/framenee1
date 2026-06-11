import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Image, ListTodo, Trophy, Cloud } from 'lucide-react';
import { format } from 'date-fns';
import { CalendarDetailPage } from './components/CalendarDetailPage';
import { PhotoDetailPage } from './components/PhotoDetailPage';
import { TodoDetailPage } from './components/TodoDetailPage';
import { RewardsDetailPage } from './components/RewardsDetailPage';
import { AppProvider, useAppContext } from './context/AppContext';

type ModuleType = 'calendar' | 'photos' | 'todos' | 'rewards' | null;

function AppContent() {
  const { familyMembers, tasks, photos, isLoading } = useAppContext();

  const [selectedModule, setSelectedModule] = useState<ModuleType>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Use shared data
  const photoUrls = photos.map(p => p.url);
  const hasPhotos = photoUrls.length > 0;
  const safePhotoIndex = hasPhotos ? currentPhotoIndex % photoUrls.length : 0;
  const upcomingTodos = tasks.slice(0, 3).map(task => ({
    text: task.text,
    time: task.dueDate === 'Today' ? 'Today' : 'Tomorrow',
    assignee: task.assignee
  }));
  const familyRanking = [...familyMembers].sort((a, b) => b.points - a.points).slice(0, 3);

  const weather = {
    temp: 72,
    condition: 'Partly Cloudy',
    icon: Cloud,
    high: 78,
    low: 65,
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
      if (photoTimer) {
        clearInterval(photoTimer);
      }
    };
  }, [hasPhotos, photoUrls.length]);

  const handleModuleClick = (moduleId: ModuleType) => {
    setSelectedModule(moduleId);
  };

  const handleClose = () => {
    setSelectedModule(null);
  };

  return (
    <div className="size-full bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[177.78vh] h-full max-h-[56.25vw] relative overflow-hidden">
        {/* Animated Wave Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200">
          <svg className="absolute bottom-0 w-full h-2/5" preserveAspectRatio="none" viewBox="0 0 1440 320">
            {/* Wave Layer 1 - Back */}
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

            {/* Wave Layer 2 - Middle */}
            <motion.path
              fill="url(#wave-gradient-2)"
              fillOpacity="0.3"
              d="M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,133.3C840,117,960,107,1080,112C1200,117,1320,139,1380,149.3L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              animate={{
                d: [
                  "M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,133.3C840,117,960,107,1080,112C1200,117,1320,139,1380,149.3L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,64L60,80C120,96,240,128,360,133.3C480,139,600,117,720,101.3C840,85,960,75,1080,80C1200,85,1320,107,1380,117.3L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,128L60,144C120,160,240,192,360,197.3C480,203,600,181,720,165.3C840,149,960,139,1080,144C1200,149,1320,171,1380,181.3L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,133.3C840,117,960,107,1080,112C1200,117,1320,139,1380,149.3L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                ],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: [0.42, 0, 0.58, 1],
                repeatType: "reverse",
                delay: 2,
              }}
              style={{ filter: 'blur(20px)' }}
            />

            {/* Wave Layer 3 - Front */}
            <motion.path
              fill="url(#wave-gradient-3)"
              fillOpacity="0.4"
              d="M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,224C840,224,960,192,1080,181.3C1200,171,1320,181,1380,186.7L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              animate={{
                d: [
                  "M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,224C840,224,960,192,1080,181.3C1200,171,1320,181,1380,186.7L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,256L60,245.3C120,235,240,213,360,218.7C480,224,600,256,720,256C840,256,960,224,1080,213.3C1200,203,1320,213,1380,218.7L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,192L60,181.3C120,171,240,149,360,154.7C480,160,600,192,720,192C840,192,960,160,1080,149.3C1200,139,1320,149,1380,154.7L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,224C840,224,960,192,1080,181.3C1200,171,1320,181,1380,186.7L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                ],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: [0.65, 0, 0.35, 1],
                repeatType: "reverse",
                delay: 5,
              }}
              style={{ filter: 'blur(15px)' }}
            />

            {/* Wave Layer 4 - Topmost */}
            <motion.path
              fill="url(#wave-gradient-4)"
              fillOpacity="0.5"
              d="M0,288L60,277.3C120,267,240,245,360,250.7C480,256,600,288,720,288C840,288,960,256,1080,245.3C1200,235,1320,245,1380,250.7L1440,256L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              animate={{
                d: [
                  "M0,288L60,277.3C120,267,240,245,360,250.7C480,256,600,288,720,288C840,288,960,256,1080,245.3C1200,235,1320,245,1380,250.7L1440,256L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,256L60,245.3C120,235,240,213,360,218.7C480,224,600,256,720,256C840,256,960,224,1080,213.3C1200,203,1320,213,1380,218.7L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,224C840,224,960,192,1080,181.3C1200,171,1320,181,1380,186.7L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                  "M0,288L60,277.3C120,267,240,245,360,250.7C480,256,600,288,720,288C840,288,960,256,1080,245.3C1200,235,1320,245,1380,250.7L1440,256L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z",
                ],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: [0.4, 0, 0.2, 1],
                repeatType: "reverse",
                delay: 8,
              }}
              style={{ filter: 'blur(10px)' }}
            />

            <defs>
              <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="wave-gradient-3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
              <linearGradient id="wave-gradient-4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#ec4899" />
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
            <div className="flex items-center justify-between mb-3">
              <div>
                <motion.h1
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-0.5 text-2xl"
                >
                  Family Smart Frame
                </motion.h1>
                <motion.p
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-xs"
                >
                  {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </motion.p>
              </div>

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 flex items-center gap-2"
              >
                <weather.icon className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-xl leading-none">{weather.temp}°F</div>
                  <div className="text-muted-foreground text-[10px]">{weather.condition}</div>
                  <div className="text-muted-foreground text-[9px]">H: {weather.high}° L: {weather.low}°</div>
                </div>
              </motion.div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3 w-full min-h-0">
              {/* Calendar Widget */}
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.5,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModuleClick('calendar')}
                className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

                <div className="relative p-3 h-full flex flex-col text-center">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm">Family Calendar</h3>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-4xl leading-none mb-1">{format(currentDate, 'd')}</div>
                    <div className="text-xs text-muted-foreground mb-0.5">{format(currentDate, 'EEEE')}</div>
                    <div className="text-[10px] text-muted-foreground mb-2">{format(currentDate, 'MMMM yyyy')}</div>
                    <div className="w-full space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-left truncate">Family Movie Night - 8:00 PM</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="text-left truncate">Soccer Practice - Tomorrow</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Photo Frame Widget */}
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.6,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModuleClick('photos')}
                className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

                <div className="relative p-3 h-full flex flex-col">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Image className="w-4 h-4 text-purple-500" />
                    <h3 className="text-sm">Photo Frame</h3>
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
                          alt="Family photo"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded-full text-[9px]">
                          {safePhotoIndex + 1} / {photoUrls.length}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
                        {isLoading ? 'Loading photos...' : 'No photos available yet'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>

              {/* To-Do List Widget */}
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.7,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModuleClick('todos')}
                className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

                <div className="relative p-3 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ListTodo className="w-4 h-4 text-green-500" />
                      <h3 className="text-sm">To-Do List</h3>
                    </div>
                    <div className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px]">
                      3 upcoming
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 text-left overflow-hidden">
                    {upcomingTodos.map((todo, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded-md">
                        <div className="flex items-start gap-1.5">
                          <div className="w-3 h-3 rounded-full border-2 border-green-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] truncate">{todo.text}</div>
                            <div className="text-[9px] text-muted-foreground truncate">{todo.time}</div>
                            <div className="text-[9px] text-green-600 truncate">👤 {todo.assignee}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.button>

              {/* Family Rewards Widget */}
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.8,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModuleClick('rewards')}
                className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

                <div className="relative p-3 h-full flex flex-col">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm">Family Rewards</h3>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="mb-2 p-2 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="text-2xl leading-none">{familyRanking[0].avatar}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] opacity-90">🏆 Top Performer</div>
                          <div className="text-xs truncate">{familyRanking[0].name}</div>
                          <div className="text-[9px] opacity-90">{familyRanking[0].points} points</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      {familyRanking.slice(1).map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 bg-muted rounded-md">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[9px] flex-shrink-0">
                              {idx + 2}
                            </div>
                            <div className="text-base leading-none flex-shrink-0">{member.avatar}</div>
                            <span className="text-[11px] truncate">{member.name}</span>
                          </div>
                          <span className="text-amber-600 text-[10px] flex-shrink-0">{member.points} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-center mt-2 text-muted-foreground text-[10px]"
            >
              Tap any module to explore
            </motion.div>
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
            {selectedModule === 'todos' && <TodoDetailPage onClose={handleClose} />}
            {selectedModule === 'rewards' && <RewardsDetailPage onClose={handleClose} />}
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
