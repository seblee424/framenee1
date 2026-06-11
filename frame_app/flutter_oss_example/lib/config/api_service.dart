import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'aliyun_config.dart';

/// API 服务 - 与后端通信的客户端
///
/// 所有与后端 API 的通信都通过此类进行。
/// 自动管理 JWT token 的存储和发送。
class ApiService {
  static const String _tokenKey = 'framene.auth_token';
  static const String _userKey = 'framene.user_data';

  static String? _cachedToken;
  static Map<String, dynamic>? _cachedUser;

  /// 获取存储的 JWT token
  static Future<String?> getToken() async {
    if (_cachedToken != null) return _cachedToken;
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(_tokenKey);
    return _cachedToken;
  }

  /// 保存 JWT token
  static Future<void> saveToken(String token) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  /// 清除 token（登出时调用）
  static Future<void> clearToken() async {
    _cachedToken = null;
    _cachedUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  /// 保存用户数据到本地
  static Future<void> saveUserData(Map<String, dynamic> userData) async {
    _cachedUser = userData;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(userData));
  }

  /// 获取缓存的用户数据
  static Future<Map<String, dynamic>?> getUserData() async {
    if (_cachedUser != null) return _cachedUser;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw != null) {
      _cachedUser = jsonDecode(raw) as Map<String, dynamic>;
      return _cachedUser;
    }
    return null;
  }

  /// 构建带认证头的请求头
  static Future<Map<String, String>> _buildHeaders({
    bool withAuth = true,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
    if (withAuth) {
      final token = await getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  /// 发送 GET 请求
  static Future<Map<String, dynamic>> get(
    String path, {
    bool withAuth = true,
  }) async {
    final url = Uri.parse('${AliyunConfig.apiBaseUrl}$path');
    final headers = await _buildHeaders(withAuth: withAuth);

    final response = await http.get(url, headers: headers);
    return _handleResponse(response);
  }

  /// 发送 POST 请求
  static Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = true,
  }) async {
    final url = Uri.parse('${AliyunConfig.apiBaseUrl}$path');
    final headers = await _buildHeaders(withAuth: withAuth);

    final response = await http.post(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  /// 发送 PUT 请求
  static Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = true,
  }) async {
    final url = Uri.parse('${AliyunConfig.apiBaseUrl}$path');
    final headers = await _buildHeaders(withAuth: withAuth);

    final response = await http.put(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  /// 发送 DELETE 请求
  static Future<Map<String, dynamic>> delete(
    String path, {
    bool withAuth = true,
  }) async {
    final url = Uri.parse('${AliyunConfig.apiBaseUrl}$path');
    final headers = await _buildHeaders(withAuth: withAuth);

    final response = await http.delete(url, headers: headers);
    return _handleResponse(response);
  }

  /// 上传文件（multipart/form-data）
  static Future<Map<String, dynamic>> uploadFile(
    String path, {
    required List<int> fileBytes,
    required String fileName,
    String fieldName = 'file',
  }) async {
    final url = Uri.parse('${AliyunConfig.apiBaseUrl}$path');
    final token = await getToken();

    final request = http.MultipartRequest('POST', url);
    request.headers['ngrok-skip-browser-warning'] = 'true';
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    request.files.add(http.MultipartFile.fromBytes(
      fieldName,
      fileBytes,
      filename: fileName,
    ));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response);
  }

  /// 统一处理响应
  static Map<String, dynamic> _handleResponse(http.Response response) {
    final body = response.body.isNotEmpty
        ? jsonDecode(response.body) as Map<String, dynamic>
        : <String, dynamic>{};

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    final errorMsg = body['error'] as String? ??
        body['message'] as String? ??
        '请求失败 (${response.statusCode})';

    throw ApiException(
      statusCode: response.statusCode,
      message: errorMsg,
    );
  }
}

/// API 异常类
class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => message;
}
