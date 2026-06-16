import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Smartphone, Wifi, Clock, Check, X } from 'lucide-react';
import { authService } from '@/services/authService';
import type { User as UserType } from '@/types/auth';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function ProfilePanel({ isOpen, onClose, onLoginSuccess }: ProfilePanelProps) {
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const savedUser = authService.getSavedUser();
    setUser(savedUser);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20"
          />

          {/* 面板 */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute top-20 right-8 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* 标题 */}
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">个人信息</span>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 设备信息 */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <h4 className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  设备信息
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                  <span>网络状态：<span className="text-green-600">已连接</span></span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>FrameNe Web v1.0</span>
                </div>
              </div>

              {/* 当前用户信息（只读，不显示退出登录） */}
              {user ? (
                <div className="p-3 bg-blue-50 rounded-xl">
                  <h4 className="text-xs text-muted-foreground mb-2">当前登录账号</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-muted-foreground text-center">
                    未登录
                  </p>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    请进入「设备账号」模块添加账号
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
