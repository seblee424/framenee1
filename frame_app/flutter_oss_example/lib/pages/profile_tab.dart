import 'package:flutter/material.dart';

import '../models/app_user.dart';
import '../services/app_backend.dart';

class ProfileTab extends StatefulWidget {
  final AppUser user;
  final VoidCallback onLogout;

  const ProfileTab({super.key, required this.user, required this.onLogout});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  bool _feishuConnected = false;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _refreshConnections();
  }

  Future<void> _refreshConnections() async {
    try {
      final feishu = await AppBackend.isFeishuConnected(widget.user);
      if (!mounted) return;
      setState(() {
        _feishuConnected = feishu;
        _checking = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('我的',
                  style:
                      TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),

              // User info card
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: Colors.orange.shade100,
                      child: Text(
                        widget.user.name.isNotEmpty
                            ? widget.user.name[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange.shade700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.user.name,
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          if (widget.user.hasPhone)
                            Text(widget.user.phone!,
                                style: TextStyle(
                                    color: Colors.grey.shade600,
                                    fontSize: 14)),
                          if (widget.user.hasEmail)
                            Text(widget.user.email!,
                                style: TextStyle(
                                    color: Colors.grey.shade600,
                                    fontSize: 14)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _providerLabel(widget.user.loginProvider),
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.orange.shade700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Settings
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    // 日历连接
                    _buildSettingItem(
                      icon: Icons.calendar_month,
                      title: '日历连接',
                      subtitle: _checking
                          ? '检查中...'
                          : (_feishuConnected
                              ? '已连接飞书'
                              : '未连接日历'),
                      trailing: _buildConnectionIcons(),
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 56),
                    _buildSettingItem(
                      icon: Icons.photo_library,
                      title: '相册设置',
                      subtitle: '管理照片上传和存储',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 56),
                    _buildSettingItem(
                      icon: Icons.notifications_outlined,
                      title: '通知设置',
                      subtitle: '管理推送通知',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 56),
                    _buildSettingItem(
                      icon: Icons.info_outline,
                      title: '关于',
                      subtitle: '版本 1.0.0',
                      onTap: () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Logout
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('确认退出'),
                        content: const Text('确定要退出登录吗？'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('取消'),
                          ),
                          FilledButton(
                            onPressed: () {
                              Navigator.pop(context);
                              widget.onLogout();
                            },
                            child: const Text('退出'),
                          ),
                        ],
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child:
                      const Text('退出登录', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConnectionIcons() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_feishuConnected)
          Icon(Icons.check_circle, size: 16, color: Colors.blue.shade700),
      ],
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: Colors.grey.shade700, size: 22),
      ),
      title:
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      trailing: trailing ?? const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }

  String _providerLabel(String provider) {
    switch (provider) {
      case 'phone':
        return '手机号登录';
      case 'email':
        return '邮箱登录';
      case 'feishu':
        return '飞书登录';
      default:
        return provider;
    }
  }
}
