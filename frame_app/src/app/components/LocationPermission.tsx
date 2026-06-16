import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Mic, Shield, Check, X } from 'lucide-react';

interface PermissionResult {
  timezone: string;
  micGranted: boolean;
  locationGranted: boolean;
}

interface LocationPermissionProps {
  onComplete: (result: PermissionResult) => void;
}

export function LocationPermission({ onComplete }: LocationPermissionProps) {
  const [step, setStep] = useState<'prompt' | 'requesting' | 'error'>('prompt');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAllow = async () => {
    setStep('requesting');

    let locationGranted = false;
    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
    let micGranted = false;

    // 1. 请求地理位置权限
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 86400000, // 缓存 24 小时
        });
      });
      locationGranted = true;

      // 通过坐标反查时区（使用 Intl API 根据坐标获取时区）
      // 用 Intl 的 timezone 即可，坐标主要用于确认
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
    } catch {
      // 定位失败，使用浏览器时区
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
      console.log('定位未授权，使用浏览器时区:', timezone);
    }

    // 2. 请求麦克风权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // 立即释放
      micGranted = true;
    } catch {
      console.log('麦克风未授权，可在需要时手动开启');
    }

    // 保存到 localStorage
    try {
      localStorage.setItem('framene.permissions', JSON.stringify({
        timezone,
        micGranted,
        locationGranted,
        version: 1,
      }));
    } catch { /* ignore */ }

    onComplete({ timezone, micGranted, locationGranted });
  };

  const handleDeny = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
    // 保存拒绝状态，不再询问
    try {
      localStorage.setItem('framene.permissions', JSON.stringify({
        timezone,
        micGranted: false,
        locationGranted: false,
        version: 1,
        denied: true,
      }));
    } catch { /* ignore */ }

    onComplete({ timezone, micGranted: false, locationGranted: false });
  };

  // 读取已保存的权限
  const saved = (() => {
    try {
      const raw = localStorage.getItem('framene.permissions');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  // 已有权限记录，跳过对话框
  if (saved) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        >
          {/* 顶部图标 */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-center">
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-xl text-white mt-3 font-medium">FrameNe 权限请求</h2>
          </div>

          {/* 权限列表 */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium">访问当前位置</div>
                <div className="text-xs text-muted-foreground">用于检测你所在的时区，正确记录日程时间</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-green-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium">使用麦克风</div>
                <div className="text-xs text-muted-foreground">用于语音录入日程，无需手动打字</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              授权后自动保存，之后不再询问
            </p>

            {step === 'error' && (
              <p className="text-xs text-red-500 text-center">{errorMsg}</p>
            )}

            {/* 按钮 */}
            <div className="flex gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeny}
                disabled={step === 'requesting'}
                className="flex-1 py-3 bg-gray-100 text-muted-foreground rounded-xl text-sm font-medium disabled:opacity-50"
              >
                <X className="w-4 h-4 inline mr-1" />
                拒绝
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAllow}
                disabled={step === 'requesting'}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {step === 'requesting' ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    请求中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    允许
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** 获取已保存的时区 */
export function getSavedTimezone(): string {
  try {
    const raw = localStorage.getItem('framene.permissions');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.timezone) return data.timezone;
    }
  } catch { /* ignore */ }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
}

/** 获取已保存的麦克风权限 */
export function isMicPermissionGranted(): boolean {
  try {
    const raw = localStorage.getItem('framene.permissions');
    if (raw) {
      const data = JSON.parse(raw);
      return data.micGranted === true;
    }
  } catch { /* ignore */ }
  return false;
}
