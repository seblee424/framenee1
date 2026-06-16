import { useState, useEffect } from 'react';
import { Users, Home, RefreshCw, Trash2, Clock, Mail, LogIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { webAccountsApi, type DeviceAccount } from '@/services/frameNe/webAccounts';
import { authService } from '@/services/authService';

interface AccountManagementProps {
  onClose: () => void;
  onAccountChanged?: () => void;
}

export function AccountManagement({ onClose, onAccountChanged }: AccountManagementProps) {
  const [accounts, setAccounts] = useState<DeviceAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 登录表单
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loadAccounts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await webAccountsApi.list();
      setAccounts(result.items);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码');
      return;
    }
    if (accounts.length >= 5) {
      setError('设备账号已达上限（最多5个），请先移除一个账号');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const user = await authService.loginWithEmail(email, password);
      // 登录成功后同步账号到设备
      await webAccountsApi.sync(user.email!, user.name, user.loginProvider);
      await loadAccounts();
      setEmail('');
      setPassword('');
      onAccountChanged?.();
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async (account: DeviceAccount) => {
    if (!window.confirm(`确定退出登录「${account.email}」？\n该账号在 Web 端的日程数据将被保留。`)) return;

    try {
      // 直接删除设备账号记录
      await webAccountsApi.remove(account.id);
      // 如果退出的账号是当前登录的 JWT 用户，也清除 JWT
      const currentToken = authService.getToken();
      if (currentToken) {
        const savedUser = authService.getSavedUser();
        if (savedUser?.email === account.email) {
          await authService.logout();
        }
      }
      await loadAccounts();
      onAccountChanged?.();
    } catch (err: any) {
      setError(err.message || '退出失败');
    }
  };

  const handleSync = async (account: DeviceAccount) => {
    try {
      setError('');
      const result = await webAccountsApi.syncFromAccount(account.email);
      if (result.synced > 0) {
        await loadAccounts();
        // 触发刷新首页日历数据
        onAccountChanged?.();
      } else {
        // 即使没有新数据也更新同步时间
        await loadAccounts();
      }
    } catch (err: any) {
      setError(err.message || '同步失败');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '从未同步';
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '未知';
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* 顶部标题 */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <h2 className="text-2xl">设备账号管理</h2>
          </div>
          <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
            已关联 {accounts.length} / 5 个账号
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 p-6 overflow-auto">
        {/* 登录表单（未满5个时显示） */}
        {accounts.length < 5 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-sm rounded-xl p-5 shadow-lg mb-4"
          >
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-blue-500" />
              添加账号（邮箱登录）
            </h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="邮箱地址"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-border focus:outline-none focus:border-blue-400"
              />
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-border focus:outline-none focus:border-blue-400"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEmailLogin}
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><LogIn className="w-4 h-4" /> 登录并添加到设备</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {accounts.length >= 5 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
            设备账号已达上限（5个），请先移除一个账号后再添加新账号
          </div>
        )}

        {/* 账号列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            加载中...
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            暂无关联账号，请在上方登录
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {account.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm mb-0.5">{account.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{account.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>同步：{formatDate(account.last_sync_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0 ml-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSync(account)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      title="同步内容"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLogout(account)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="退出登录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-xs mt-4 text-center"
          >
            {error}
          </motion.p>
        )}
      </div>

      {/* 底部导航 */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          <Home className="w-6 h-6" />
          <span>返回首页</span>
        </motion.button>
      </div>
    </div>
  );
}
