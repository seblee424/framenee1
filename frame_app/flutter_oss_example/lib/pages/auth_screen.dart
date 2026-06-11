import 'package:flutter/material.dart';

import 'dart:html' as html;

import '../models/app_user.dart';
import '../services/app_backend.dart';

/// 登录界面
///
/// 支持三种登录方式：
/// 1. 手机号验证码登录
/// 2. 邮箱密码登录
/// 3. 飞书扫码登录
class AuthScreen extends StatefulWidget {
  final ValueChanged<AppUser> onLogin;

  const AuthScreen({super.key, required this.onLogin});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  // 登录方式切换
  late TabController _tabController;

  // 手机号登录
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  bool _isSendingCode = false;
  bool _isPhoneLoggingIn = false;
  int _countdown = 0;

  // 邮箱登录
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _emailCodeController = TextEditingController();
  bool _isEmailRegister = false;
  bool _isEmailLoggingIn = false;
  bool _isSendingEmailCode = false;
  int _emailCodeCountdown = 0;

  // 通用
  String? _errorMessage;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _phoneController.dispose();
    _codeController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  // ==========================================
  // 手机号登录
  // ==========================================

  Future<void> _sendCode() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty || phone.length < 11) {
      setState(() => _errorMessage = '请输入正确的手机号');
      return;
    }

    setState(() {
      _isSendingCode = true;
      _errorMessage = null;
    });

    try {
      await AppBackend.sendPhoneCode(phone);
      setState(() {
        _countdown = 60;
        _isSendingCode = false;
      });
      _startCountdown();
    } catch (error) {
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
        _isSendingCode = false;
      });
    }
  }

  void _startCountdown() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() {
        if (_countdown > 0) {
          _countdown--;
        }
      });
      return _countdown > 0;
    });
  }

  Future<void> _loginWithPhone() async {
    final phone = _phoneController.text.trim();
    final code = _codeController.text.trim();

    if (phone.isEmpty || code.isEmpty) {
      setState(() => _errorMessage = '请填写手机号和验证码');
      return;
    }

    setState(() {
      _isPhoneLoggingIn = true;
      _errorMessage = null;
    });

    try {
      final user = await AppBackend.loginWithPhone(phone, code);
      if (!mounted) return;
      widget.onLogin(user);
    } catch (error) {
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
        _isPhoneLoggingIn = false;
      });
    }
  }

  // ==========================================
  // 邮箱登录/注册
  // ==========================================

  /// 发送邮箱验证码
  Future<void> _sendEmailCode() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = '请输入正确的邮箱地址');
      return;
    }

    setState(() {
      _isSendingEmailCode = true;
      _errorMessage = null;
    });

    try {
      await AppBackend.sendEmailCode(email);
      setState(() {
        _emailCodeCountdown = 60;
        _isSendingEmailCode = false;
      });
      _startEmailCodeCountdown();
    } catch (error) {
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
        _isSendingEmailCode = false;
      });
    }
  }

  void _startEmailCodeCountdown() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() {
        if (_emailCodeCountdown > 0) {
          _emailCodeCountdown--;
        }
      });
      return _emailCodeCountdown > 0;
    });
  }

  Future<void> _loginWithEmail() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = '请填写邮箱和密码');
      return;
    }

    setState(() {
      _isEmailLoggingIn = true;
      _errorMessage = null;
    });

    try {
      AppUser user;
      if (_isEmailRegister) {
        final name = _nameController.text.trim();
        final code = _emailCodeController.text.trim();
        if (name.isEmpty) {
          setState(() {
            _errorMessage = '请填写用户名';
            _isEmailLoggingIn = false;
          });
          return;
        }
        if (code.isEmpty) {
          setState(() {
            _errorMessage = '请填写邮箱验证码';
            _isEmailLoggingIn = false;
          });
          return;
        }
        // 使用邮箱验证码注册
        user = await AppBackend.registerWithEmailCode(
          email: email,
          code: code,
          password: password,
          name: name,
        );
      } else {
        user = await AppBackend.loginWithEmail(email, password);
      }
      if (!mounted) return;
      widget.onLogin(user);
    } catch (error) {
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
        _isEmailLoggingIn = false;
      });
    }
  }

  // ==========================================
  // 钉钉登录
  // ==========================================

  Future<void> _loginWithFeishu() async {
    setState(() => _errorMessage = null);

    try {
      // 飞书 OAuth 需要跳转到飞书授权页面
      final authUrl = await AppBackend.getFeishuAuthUrl();
      // 直接跳转（Safari 会拦截弹窗）
      html.window.location.href = authUrl;
      setState(() {
        _errorMessage = '正在跳转到飞书授权页面...';
      });
    } catch (error) {
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  // ==========================================
  // Demo 模式登录
  // ==========================================

  Future<void> _loginAsDemo() async {
    setState(() => _errorMessage = null);
    try {
      final user = await AppBackend.loginAsDemo();
      if (!mounted) return;
      widget.onLogin(user);
    } catch (error) {
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  // ==========================================
  // UI 构建
  // ==========================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            children: [
              // Logo 和标题
              const SizedBox(height: 20),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(Icons.photo_library,
                    size: 36, color: Colors.orange.shade700),
              ),
              const SizedBox(height: 20),
              const Text(
                '欢迎回到 FrameNe',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                '登录以查看共享相册和家庭日历',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 32),

              // 登录方式 Tab
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: Colors.orange.shade700,
                  unselectedLabelColor: Colors.grey.shade600,
                  labelStyle: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600),
                  tabs: const [
                    Tab(text: '手机号'),
                    Tab(text: '邮箱'),
                    Tab(text: '飞书'),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Tab 内容
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildPhoneTab(),
                    _buildEmailTab(),
                    _buildFeishuTab(),
                  ],
                ),
              ),

              // 错误信息
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade100),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline,
                            size: 18, color: Colors.red.shade400),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(
                                color: Colors.red.shade700, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Demo 模式入口
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _loginAsDemo,
                    icon: Icon(Icons.explore_outlined,
                        size: 18, color: Colors.grey.shade600),
                    label: const Text('体验 Demo（不录入数据）'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      foregroundColor: Colors.grey.shade600,
                      side: BorderSide(color: Colors.grey.shade300),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
              ),

              // 底部协议
              Text(
                '登录即表示同意服务条款和隐私政策',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // 手机号登录 Tab
  // ==========================================

  Widget _buildPhoneTab() {
    return SingleChildScrollView(
      child: Column(
        children: [
          // 手机号输入
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text('+86',
                    style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700)),
                const SizedBox(width: 8),
                Container(width: 1, height: 24, color: Colors.grey.shade300),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    maxLength: 11,
                    decoration: const InputDecoration(
                      hintText: '请输入手机号',
                      border: InputBorder.none,
                      counterText: '',
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 验证码输入
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.sms, size: 20, color: Colors.grey.shade500),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: const InputDecoration(
                      hintText: '请输入验证码',
                      border: InputBorder.none,
                      counterText: '',
                    ),
                  ),
                ),
                TextButton(
                  onPressed:
                      _isSendingCode || _countdown > 0 ? null : _sendCode,
                  child: Text(
                    _countdown > 0
                        ? '${_countdown}s'
                        : (_isSendingCode ? '发送中...' : '获取验证码'),
                    style: TextStyle(
                      fontSize: 13,
                      color:
                          _countdown > 0 ? Colors.grey : Colors.orange.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 登录按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isPhoneLoggingIn ? null : _loginWithPhone,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.orange.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: _isPhoneLoggingIn
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('登录', style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 邮箱登录 Tab
  // ==========================================

  Widget _buildEmailTab() {
    return SingleChildScrollView(
      child: Column(
        children: [
          // 用户名（注册时显示）
          if (_isEmailRegister) ...[
            Container(
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Icon(Icons.person_outline,
                      size: 20, color: Colors.grey.shade500),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        hintText: '请输入用户名',
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // 邮箱输入
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.email_outlined,
                    size: 20, color: Colors.grey.shade500),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: '请输入邮箱',
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 邮箱验证码（注册时显示）
          if (_isEmailRegister) ...[
            Container(
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Icon(Icons.mail_outline,
                      size: 20, color: Colors.grey.shade500),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _emailCodeController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: const InputDecoration(
                        hintText: '请输入邮箱验证码',
                        border: InputBorder.none,
                        counterText: '',
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _isSendingEmailCode || _emailCodeCountdown > 0
                        ? null
                        : _sendEmailCode,
                    child: Text(
                      _emailCodeCountdown > 0
                          ? '${_emailCodeCountdown}s'
                          : (_isSendingEmailCode ? '发送中...' : '获取验证码'),
                      style: TextStyle(
                        fontSize: 13,
                        color: _emailCodeCountdown > 0
                            ? Colors.grey
                            : Colors.orange.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // 密码输入
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.lock_outline, size: 20, color: Colors.grey.shade500),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      hintText: _isEmailRegister ? '请设置密码（至少6位）' : '请输入密码',
                      border: InputBorder.none,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    size: 20,
                    color: Colors.grey.shade500,
                  ),
                  onPressed: () {
                    setState(() => _obscurePassword = !_obscurePassword);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 登录/注册按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isEmailLoggingIn ? null : _loginWithEmail,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.orange.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: _isEmailLoggingIn
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      _isEmailRegister ? '注册' : '登录',
                      style: const TextStyle(fontSize: 16),
                    ),
            ),
          ),
          const SizedBox(height: 12),

          // 切换登录/注册
          TextButton(
            onPressed: () {
              setState(() {
                _isEmailRegister = !_isEmailRegister;
                _errorMessage = null;
              });
            },
            child: Text(
              _isEmailRegister ? '已有账号？去登录' : '没有账号？去注册',
              style: TextStyle(
                color: Colors.orange.shade700,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 飞书登录 Tab
  // ==========================================

  Widget _buildFeishuTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(Icons.chat_bubble_outline,
                size: 48, color: Colors.blue.shade400),
          ),
          const SizedBox(height: 24),
          const Text(
            '使用飞书扫码登录',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            '打开飞书扫描二维码即可快速登录',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: 200,
            child: ElevatedButton.icon(
              onPressed: _loginWithFeishu,
              icon: const Icon(Icons.qr_code_scanner, size: 20),
              label: const Text('飞书扫码登录'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                backgroundColor: Colors.blue.shade600,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
