import 'dart:html' as html;
import 'dart:js' as js;

import 'package:flutter/material.dart';

import 'pages/home_page.dart';

class FrameNeApp extends StatefulWidget {
  const FrameNeApp({super.key});

  @override
  State<FrameNeApp> createState() => _FrameNeAppState();
}

class _FrameNeAppState extends State<FrameNeApp> {
  bool? _permissionsGranted;

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  void _checkPermissions() {
    try {
      final saved = html.window.localStorage['framene.permissions'];
      if (saved != null) {
        setState(() => _permissionsGranted = true);
      } else {
        setState(() => _permissionsGranted = false);
      }
    } catch (_) {
      setState(() => _permissionsGranted = true);
    }
  }

  void _handleAllow() {
    // 请求地理位置
    try {
      js.context.callMethod('navigator.geolocation.getCurrentPosition', [
        js.allowInterop((_) {}),
        js.allowInterop((_) {}),
      ]);
    } catch (_) {}

    // 预检查麦克风权限
    try {
      final sr = js.context.hasProperty('webkitSpeechRecognition')
          ? js.context['webkitSpeechRecognition']
          : js.context['SpeechRecognition'];
      if (sr != null) {
        js.context.callMethod('eval', ['new (window.webkitSpeechRecognition || window.SpeechRecognition)()']);
      }
    } catch (_) {}

    final now = DateTime.now();
    html.window.localStorage['framene.permissions'] =
        '{"timezone":"${now.timeZoneName}","micGranted":true,"locationGranted":true,"version":1}';
    setState(() => _permissionsGranted = true);
  }

  void _handleDeny() {
    html.window.localStorage['framene.permissions'] = '{"denied":true,"version":1}';
    setState(() => _permissionsGranted = true);
  }

  @override
  Widget build(BuildContext context) {
    if (_permissionsGranted == null) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        home: const Scaffold(body: Center(child: CircularProgressIndicator())),
      );
    }

    if (_permissionsGranted == false) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: Center(
            child: Container(
              margin: const EdgeInsets.all(32),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20)],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(Icons.shield_outlined, size: 36, color: Colors.orange.shade700),
                  ),
                  const SizedBox(height: 16),
                  const Text('FrameNe 权限请求',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  _permissionItem(Icons.location_on, '访问当前位置', '用于检测时区，正确记录日程时间'),
                  const SizedBox(height: 8),
                  _permissionItem(Icons.mic, '使用麦克风', '用于语音录入日程'),
                  const SizedBox(height: 12),
                  const Text('授权后自动保存，之后不再询问',
                      style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _handleDeny,
                          child: const Text('拒绝'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: _handleAllow,
                          child: const Text('允许'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return MaterialApp(
      title: 'FrameNe',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.orange,
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.grey.shade50,
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.grey.shade50,
          elevation: 0,
          centerTitle: true,
        ),
      ),
      home: const HomePage(),
    );
  }

  Widget _permissionItem(IconData icon, String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: Colors.orange.shade700, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
