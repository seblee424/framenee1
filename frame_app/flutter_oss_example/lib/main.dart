import 'package:flutter/material.dart';

import 'config/aliyun_config.dart';
import 'framene_app.dart';
import 'dart:html' as html;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 检查 URL 参数：?api_url=https://xxx.ngrok.io
  // 用于手机浏览器调试，无需 DevTools
  final currentUrl = html.window.location.href;
  final uri = Uri.parse(currentUrl);

  // 钉钉/Google OAuth 回调处理
  if (uri.queryParameters.containsKey('feishu_connected')) {
    // 标记飞书已连接，后续加载时会自动检查状态
    html.window.localStorage['feishu_just_connected'] = 'true';
    final cleanUrl = uri.origin + uri.path;
    html.window.history.replaceState(null, '', cleanUrl);
  }

  if (currentUrl.contains('api_url=')) {
    final urlParamApi = uri.queryParameters['api_url'];
    if (urlParamApi != null && urlParamApi.isNotEmpty) {
      html.window.localStorage['api_base_url'] = urlParamApi;
      // 清除 URL 参数并刷新，让 localStorage 生效
      final cleanUrl = uri.origin + uri.path;
      html.window.history.replaceState(null, '', cleanUrl);
      print('Saved API URL from query param: $urlParamApi');
      // 刷新页面让 localStorage 生效
      html.window.location.reload();
    }
  }

  // 从 localStorage 读取自定义 API 地址（用于部署远程调试）
  final customApiUrl = html.window.localStorage['api_base_url'];
  if (customApiUrl != null && customApiUrl.isNotEmpty) {
    AliyunConfig.setApiBaseUrl(customApiUrl);
    print('Using custom API URL: $customApiUrl');
  } else {
    print('Using default API URL: ${AliyunConfig.apiBaseUrl}');
  }

  runApp(const FrameNeApp());
}
