/// 阿里云服务配置
///
/// 使用说明：
/// 1. 后端 API 地址会自动读取 localStorage('api_base_url')，方便调试
/// 2. 部署后可通过 localStorage 切换 API 地址
import 'dart:html' as html;

class AliyunConfig {
  // ==========================================
  // 1. 后端 API 地址
  // ==========================================
  /// 后端 API 的基础 URL
  /// 可以在浏览器控制台运行时切换：
  ///   localStorage.setItem('api_base_url', 'https://xxx.ngrok.io')
  /// 然后刷新页面即可生效。
  static String get apiBaseUrl =>
      _customApiUrl ?? _localStorageUrl ?? 'http://localhost:3000';
  static String? _customApiUrl;

  /// 从 localStorage 读取自定义 API 地址
  static String? get _localStorageUrl {
    try {
      final storage = html.window.localStorage;
      final url = storage['api_base_url'];
      if (url != null && url.isNotEmpty) {
        return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
      }
    } catch (_) {}
    return null;
  }

  static void setApiBaseUrl(String url) {
    _customApiUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }
}
