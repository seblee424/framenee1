import 'dart:html' as html;

import 'package:flutter/material.dart';

class DeviceTab extends StatelessWidget {
  const DeviceTab({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final webUrl = 'http://localhost:5173';

    return Scaffold(
      appBar: AppBar(
        title: const Text('设备管理'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ====== 设备信息卡片 ======
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: LinearGradient(
                      colors: [
                        theme.colorScheme.primaryContainer,
                        theme.colorScheme.primary.withValues(alpha: 0.1),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(Icons.tablet_android, size: 40, color: theme.colorScheme.primary),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '一号测试日程管理板',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'FrameNe Flutter App',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // ====== Web 端快捷入口 ======
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.devices, color: theme.colorScheme.primary, size: 22),
                          const SizedBox(width: 10),
                          Text('已绑定设备',
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _deviceInfoItem(context, Icons.check_circle, '当前设备', 'Flutter App（一号测试板）',
                          Colors.green),
                      const SizedBox(height: 10),
                      _deviceInfoItem(context, Icons.touch_app, 'Web 控制端', 'www.framene.com',
                          theme.colorScheme.primary),
                      const SizedBox(height: 10),
                      _deviceInfoItem(context, Icons.sync, '数据同步', '手动同步 → Web 端',
                          Colors.orange),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // ====== 同步操作 ======
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.sync_alt, color: theme.colorScheme.primary, size: 22),
                          const SizedBox(width: 10),
                          Text('同步管理',
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: () => html.window.open(webUrl, 'framene-web'),
                          icon: const Icon(Icons.open_in_new),
                          label: const Text('打开 Web 控制端'),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            html.window.localStorage['framene.web_url'] = webUrl;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Web 地址已保存')),
                            );
                          },
                          icon: const Icon(Icons.save),
                          label: const Text('保存此设备为默认'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // ====== 底部提示 ======
              Center(
                child: Text(
                  '通过 Flutter App 录入日程，同步到 Web 端管理面板',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.grey.shade400,
                    height: 1.5,
                  ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _deviceInfoItem(
      BuildContext context, IconData icon, String label, String value, Color color) {
    return Row(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 10),
        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        const Spacer(),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
      ],
    );
  }
}
