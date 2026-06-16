import { useState, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Smartphone, ShieldCheck, X } from 'lucide-react';

const DEVICE_PIN = '123456';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitInput = (value: string, index: number) => {
    if (value.length > 1) return; // 只接受单个字符
    if (!/^\d*$/.test(value)) return; // 只接受数字

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 5) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }

    // 当填满6位时自动验证
    if (index === 5 && value) {
      const fullPin = [...newPin.slice(0, 5), value].join('');
      validatePin(fullPin);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newPin = [...pin];
      if (pin[index]) {
        newPin[index] = '';
        setPin(newPin);
      } else if (index > 0) {
        newPin[index - 1] = '';
        setPin(newPin);
        setActiveIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const validatePin = (fullPin: string) => {
    if (fullPin === DEVICE_PIN) {
      onLogin();
    } else {
      setError('PIN 码错误，请重试');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin(Array(6).fill(''));
        setActiveIndex(0);
        inputRefs.current[0]?.focus();
      }, 600);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(text)) {
      const digits = text.split('');
      setPin(digits);
      const fullPin = digits.join('');
      validatePin(fullPin);
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-10 w-full max-w-md mx-4"
      >
        {/* 设备图标 */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
            className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <Smartphone className="w-10 h-10 text-white" />
          </motion.div>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl text-center mb-2">FrameNe 智能相框</h1>
        <p className="text-muted-foreground text-sm text-center mb-8">
          请输入设备 PIN 码解锁
        </p>

        {/* PIN 输入框 */}
        <motion.div
          animate={isShaking ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-3 mb-6"
        >
          {pin.map((digit, index) => (
            <div key={index} className="relative">
              <input
                ref={el => { inputRefs.current[index] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigitInput(e.target.value, index)}
                onKeyDown={e => handleKeyDown(e, index)}
                onFocus={() => setActiveIndex(index)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`
                  w-12 h-14 text-center text-xl rounded-xl border-2 transition-all
                  outline-none bg-white
                  ${digit ? 'border-blue-500 shadow-sm' : 'border-border'}
                  ${activeIndex === index ? 'border-blue-400 ring-2 ring-blue-100' : ''}
                  ${error ? 'border-red-400' : ''}
                `}
                autoFocus={index === 0}
              />
              {digit && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-xs text-center mb-4 flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 数字键盘提示 */}
        <p className="text-[10px] text-muted-foreground text-center">
          在键盘上输入 6 位数字 PIN 码即可解锁
        </p>
      </motion.div>
    </div>
  );
}
