import 'dart:convert';
import 'dart:html' as html;
import 'dart:math';
import 'dart:typed_data';

import 'package:device_calendar/device_calendar.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/aliyun_config.dart';
import '../config/api_service.dart';
import '../models/app_user.dart';
import '../models/calendar_event.dart';
import '../models/calendar_member.dart';
import '../models/media_asset.dart';

/// 应用后端服务
///
/// 所有数据操作都通过后端 API 进行。
/// 后端部署在阿里云函数计算 FC 上，连接 RDS PostgreSQL 和 OSS。
///
/// Demo 模式：
/// 设置 [isDemoMode] = true 后，所有认证操作返回模拟数据，
/// 不调用后端 API，不影响阿里云数据库。
/// 适用于展示 UI 界面、演示功能。
class AppBackend {
  static const _userKey = 'framene.local-user';
  static const _photosKey = 'framene.photos';
  static const _eventsKey = 'framene.calendar-events';
  static const _manualEventsKey = 'framene.manual-events';
  static const _membersKey = 'framene.calendar-members';

  /// Demo 模式开关
  /// true  - 所有认证操作返回模拟数据，不调用后端 API
  /// false - 正常模式，调用后端 API 操作阿里云数据库
  static bool isDemoMode = false;

  /// Demo 模拟用户
  static final AppUser _demoUser = AppUser(
    id: 'demo-user',
    phone: '138****8888',
    email: 'demo@framene.app',
    name: 'Demo 用户',
    loginProvider: 'demo',
    feishuCalendarConnected: true,
  );

  static String _randomId() {
    final now = DateTime.now().microsecondsSinceEpoch;
    final random = Random().nextInt(999999);
    return '$now$random';
  }

  static Future<SharedPreferences> get _prefs async =>
      SharedPreferences.getInstance();

  // ==========================================
  // Demo 模式登录
  // ==========================================

  /// 以 Demo 模式登录，返回模拟用户数据
  /// 不调用后端 API，不影响阿里云数据库
  static Future<AppUser> loginAsDemo() async {
    isDemoMode = true;
    await _saveUserLocally(_demoUser);
    return _demoUser;
  }

  /// 检查飞书日历是否已连接
  static Future<bool> isFeishuConnected(AppUser user) async {
    try {
      final result = await ApiService.get('/api/auth/me');
      return result['feishu_calendar_connected'] as bool? ?? false;
    } catch (_) {
      return false;
    }
  }

  /// 发送手机验证码
  static Future<void> sendPhoneCode(String phone) async {
    if (isDemoMode) {
      // Demo 模式：模拟发送成功，不实际调用 API
      return;
    }
    await ApiService.post('/api/auth/send-code', body: {
      'phone': phone,
    });
  }

  /// 手机验证码登录
  static Future<AppUser> loginWithPhone(String phone, String code) async {
    if (isDemoMode) {
      // Demo 模式：返回模拟用户
      return _demoUser;
    }
    final result = await ApiService.post('/api/auth/phone-login', body: {
      'phone': phone,
      'code': code,
    });

    final token = result['token'] as String;
    final userData = result['user'] as Map<String, dynamic>;

    await ApiService.saveToken(token);
    await ApiService.saveUserData(userData);

    final user = AppUser.fromJson(userData);
    await _saveUserLocally(user);
    return user;
  }

  /// 发送邮箱验证码
  static Future<void> sendEmailCode(String email) async {
    if (isDemoMode) {
      // Demo 模式：模拟发送成功，不实际调用 API
      return;
    }
    await ApiService.post('/api/auth/send-email-code', body: {
      'email': email,
    });
  }

  /// 邮箱验证码注册
  static Future<AppUser> registerWithEmailCode({
    required String email,
    required String code,
    required String password,
    required String name,
  }) async {
    if (isDemoMode) {
      // Demo 模式：返回模拟用户
      return _demoUser;
    }
    final result =
        await ApiService.post('/api/auth/email-code-register', body: {
      'email': email,
      'code': code,
      'password': password,
      'name': name,
    });

    final token = result['token'] as String;
    final userData = result['user'] as Map<String, dynamic>;

    await ApiService.saveToken(token);
    await ApiService.saveUserData(userData);

    final user = AppUser.fromJson(userData);
    await _saveUserLocally(user);
    return user;
  }

  /// 邮箱注册（直接密码注册，保留原有功能）
  static Future<AppUser> registerWithEmail(
      String email, String password, String name) async {
    if (isDemoMode) {
      // Demo 模式：返回模拟用户
      return _demoUser;
    }
    final result = await ApiService.post('/api/auth/email-register', body: {
      'email': email,
      'password': password,
      'name': name,
    });

    final token = result['token'] as String;
    final userData = result['user'] as Map<String, dynamic>;

    await ApiService.saveToken(token);
    await ApiService.saveUserData(userData);

    final user = AppUser.fromJson(userData);
    await _saveUserLocally(user);
    return user;
  }

  /// 邮箱密码登录
  static Future<AppUser> loginWithEmail(String email, String password) async {
    if (isDemoMode) {
      // Demo 模式：返回模拟用户
      return _demoUser;
    }
    final result = await ApiService.post('/api/auth/email-login', body: {
      'email': email,
      'password': password,
    });

    final token = result['token'] as String;
    final userData = result['user'] as Map<String, dynamic>;

    await ApiService.saveToken(token);
    await ApiService.saveUserData(userData);

    final user = AppUser.fromJson(userData);
    await _saveUserLocally(user);
    return user;
  }

  /// 钉钉登录
  static Future<AppUser> loginWithDingtalk(String authCode) async {
    if (isDemoMode) {
      // Demo 模式：返回模拟用户
      return _demoUser;
    }
    final result = await ApiService.post('/api/auth/dingtalk-login', body: {
      'auth_code': authCode,
    });

    final token = result['token'] as String;
    final userData = result['user'] as Map<String, dynamic>;

    await ApiService.saveToken(token);
    await ApiService.saveUserData(userData);

    final user = AppUser.fromJson(userData);
    await _saveUserLocally(user);
    return user;
  }

  /// 获取飞书 OAuth 授权 URL
  static Future<String> getFeishuAuthUrl() async {
    if (isDemoMode) {
      throw Exception('请先使用邮箱或手机号登录，Demo 模式不支持连接飞书日历');
    }
    final result = await ApiService.get('/api/auth/feishu-auth-url');
    return result['auth_url'] as String;
  }

  /// 处理钉钉 OAuth 回调
  static Future<void> handleDingtalkCallback(String authCode) async {
    if (isDemoMode) {
      // Demo 模式：不做任何操作
      return;
    }
    await ApiService.post('/api/auth/feishu-callback', body: {
      'auth_code': authCode,
    });
  }

  // ==========================================
  // 用户管理
  // ==========================================

  /// 加载本地缓存的用户
  static Future<AppUser?> loadSavedUser() async {
    // 先尝试从 ApiService 获取
    final userData = await ApiService.getUserData();
    if (userData != null) {
      return AppUser.fromJson(userData);
    }

    // 回退到本地存储
    final prefs = await _prefs;
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;

    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return AppUser.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  /// 保存用户到本地
  static Future<void> _saveUserLocally(AppUser user) async {
    final prefs = await _prefs;
    await prefs.setString(_userKey, jsonEncode(user.toJson()));
  }

  /// 获取当前用户信息（从后端刷新）
  static Future<AppUser> refreshUser() async {
    final result = await ApiService.get('/api/auth/me');
    final user = AppUser.fromJson(result);
    await _saveUserLocally(user);
    return user;
  }

  /// 登出
  static Future<void> logout() async {
    try {
      await ApiService.post('/api/auth/logout');
    } catch (_) {
      // 即使后端请求失败也清除本地状态
    }
    await ApiService.clearToken();
    final prefs = await _prefs;
    await prefs.remove(_userKey);
    await prefs.remove(_photosKey);
    await prefs.remove(_eventsKey);
    await prefs.remove(_manualEventsKey);
    await prefs.remove(_membersKey);
  }

  // ==========================================
  // 照片/相册 API（直连 Supabase）
  // ==========================================

  /// 上传照片到后端 OSS（代替 Supabase 直连）
  static Future<MediaAsset> uploadAlbumAsset({
    required Uint8List bytes,
    required String fileName,
    required AppUser user,
  }) async {
    try {
      final base64Str = base64Encode(bytes);
      final ownerEmail = user.email ?? user.phone ?? user.id;

      final result = await ApiService.post('/api/photos/upload-base64', body: {
        'imageBase64': base64Str,
        'fileName': fileName,
        'ownerEmail': ownerEmail,
      });

      return MediaAsset.fromJson({
        'id': result['id'],
        'url': result['url'],
        'file_name': result['file_name'],
        'storage_path': result['storage_path'],
        'file_size': result['file_size'],
        'mime_type': result['mime_type'],
        'created_at': result['created_at'],
      });
    } catch (error) {
      throw Exception('上传失败: $error');
    }
  }

  /// 删除照片（通过后端 API）
  static Future<void> deleteAlbumAsset(String photoId) async {
    try {
      await ApiService.delete('/api/photos/$photoId');
    } catch (error) {
      throw Exception('删除失败: $error');
    }
  }

  /// 获取相册列表（从后端查询，返回 OSS 签名 URL）
  static Future<List<MediaAsset>> listAlbumAssets(AppUser user) async {
    try {
      final result = await ApiService.get('/api/photos');
      final items = result['items'] as List<dynamic>? ?? [];
      return items
          .map((item) => MediaAsset.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      print('[FrameNe] 获取照片列表失败: $error');
      return [];
    }
  }

  static Future<List<MediaAsset>> _listLocalAssets() async {
    final prefs = await _prefs;
    final raw = prefs.getString(_photosKey);
    if (raw == null) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((item) => MediaAsset.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  // ==========================================
  // 日历成员 API
  // ==========================================

  static Future<List<CalendarMember>> listCalendarMembers(AppUser user) async {
    try {
      final result = await ApiService.get('/api/members');
      final items = result['items'] as List<dynamic>? ?? [];
      return items
          .map((item) => CalendarMember.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return _listLocalMembers();
    }
  }

  static Future<List<CalendarMember>> _listLocalMembers() async {
    final prefs = await _prefs;
    final raw = prefs.getString(_membersKey);
    if (raw == null) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((item) => CalendarMember.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<CalendarMember> inviteCalendarMember(
      String email, AppUser user) async {
    final newMember = CalendarMember(
      id: _randomId(),
      email: email,
      name: email.split('@').first,
      role: 'member',
      status: 'pending',
      invitedAt: DateTime.now().toIso8601String(),
    );

    try {
      final result = await ApiService.post('/api/members', body: {
        'email': email,
        'name': newMember.name,
      });
      return CalendarMember.fromJson({
        'id': result['id']?.toString() ?? _randomId(),
        'email': result['email'] ?? email,
        'name': result['name'] ?? newMember.name,
        'role': result['role'] ?? 'member',
        'status': result['status'] ?? 'pending',
        'invited_at': result['invited_at'] ?? DateTime.now().toIso8601String(),
      });
    } catch (_) {
      // 本地回退
      final current = await listCalendarMembers(user);
      final updated = current.any((item) => item.email == email)
          ? current
          : [...current, newMember];
      await _saveJsonList(
          _membersKey, updated.map((item) => item.toJson()).toList());
      return newMember;
    }
  }

  // ==========================================
  // 日历事件 API
  // ==========================================

  /// 同步飞书日历
  static Future<Map<String, dynamic>> syncFeishuCalendar(AppUser user) async {
    if (isDemoMode) {
      return {'events_synced': 0, 'items': <dynamic>[]};
    }
    try {
      final result = await ApiService.post('/api/events/sync/feishu');
      // 缓存事件到本地
      if (result['items'] != null && result['items'] is List) {
        final events = (result['items'] as List)
            .map((item) => CalendarEvent.fromJson(item as Map<String, dynamic>))
            .toList();
        final prefs = await _prefs;
        final raw = prefs.getString(_eventsKey);
        final List<dynamic> existing =
            raw != null ? jsonDecode(raw) as List<dynamic> : [];
        final syncedIds = events.map((e) => e.id).toSet();
        final merged = [
          ...existing.where((e) {
            final json = e as Map<String, dynamic>;
            return !syncedIds.contains(json['id']);
          }),
          ...events.map((e) => e.toJson()),
        ];
        await prefs.setString(_eventsKey, jsonEncode(merged));
      }
      return result;
    } catch (error) {
      throw Exception('飞书日历同步失败: $error');
    }
  }

  /// 同步设备本地日历
  /// 注意：Web 平台不支持设备日历同步，会优雅降级
  static Future<List<CalendarEvent>> syncLocalCalendar(AppUser user) async {
    // Web 平台不支持 device_calendar 插件
    try {
      final deviceCalendarPlugin = DeviceCalendarPlugin();

      final permissionsResult = await deviceCalendarPlugin.requestPermissions();
      if (permissionsResult.hasErrors) {
        throw Exception('请授予日历访问权限');
      }

      final calendarsResult = await deviceCalendarPlugin.retrieveCalendars();
      if (calendarsResult.hasErrors || calendarsResult.data == null) {
        throw Exception('无法获取设备日历');
      }

      final now = DateTime.now();
      final startDate = DateTime(now.year, now.month, now.day - 7);
      final endDate = DateTime(now.year, now.month, now.day + 30);

      final allEvents = <CalendarEvent>[];

      for (final calendar in calendarsResult.data!) {
        if (calendar.isReadOnly == true) continue;

        final eventsResult = await deviceCalendarPlugin.retrieveEvents(
          calendar.id,
          RetrieveEventsParams(startDate: startDate, endDate: endDate),
        );

        if (eventsResult.hasErrors || eventsResult.data == null) continue;

        for (final deviceEvent in eventsResult.data!) {
          if (deviceEvent.title == null || deviceEvent.title!.isEmpty) continue;

          allEvents.add(CalendarEvent(
            id: deviceEvent.eventId ?? _randomId(),
            title: deviceEvent.title!,
            description: deviceEvent.description,
            provider: 'device',
            startAt:
                deviceEvent.start?.toIso8601String() ?? now.toIso8601String(),
            endAt: deviceEvent.end?.toIso8601String() ?? now.toIso8601String(),
            location: deviceEvent.location,
            ownerEmail: user.email ?? user.phone ?? user.id,
          ));
        }
      }

      // 本地缓存
      final existingEvents = await listCalendarEvents(user);
      final nonDeviceEvents =
          existingEvents.where((e) => e.provider != 'device').toList();
      final merged = [...nonDeviceEvents, ...allEvents];
      await _saveJsonList(_eventsKey, merged.map((e) => e.toJson()).toList());

      return allEvents;
    } catch (e) {
      // 如果是 MissingPluginException（Web 平台），返回空列表
      if (e.toString().contains('MissingPluginException')) {
        return [];
      }
      rethrow;
    }
  }

  /// 添加手动事件
  static Future<CalendarEvent> addManualEvent({
    required AppUser user,
    required String title,
    String? description,
    required DateTime startAt,
    required DateTime endAt,
    String? location,
  }) async {
    final event = CalendarEvent(
      id: _randomId(),
      title: title,
      description: description,
      provider: 'manual',
      startAt: startAt.toIso8601String(),
      endAt: endAt.toIso8601String(),
      location: location,
      ownerEmail: user.email ?? user.phone ?? user.id,
    );

    try {
      final result = await ApiService.post('/api/events', body: {
        'title': event.title,
        'description': event.description,
        'provider': event.provider,
        'startAt': event.startAt,
        'endAt': event.endAt,
        'location': event.location,
      });

      final serverEvent = CalendarEvent(
        id: (result['id'] ?? '').toString(),
        title: result['title'] as String? ?? title,
        description: result['description'] as String?,
        provider: result['provider'] as String? ?? 'manual',
        startAt: result['start_at'] as String? ?? event.startAt,
        endAt: result['end_at'] as String? ?? event.endAt,
        location: result['location'] as String?,
        ownerEmail: user.email ?? user.phone ?? user.id,
      );

      await _saveEventLocally(serverEvent, user);
      return serverEvent;
    } catch (error) {
      await _saveEventLocally(event, user);
      return event;
    }
  }

  static Future<void> _saveEventLocally(
      CalendarEvent event, AppUser user) async {
    final prefs = await _prefs;
    final raw = prefs.getString(_manualEventsKey);
    final List<dynamic> existing =
        raw != null ? jsonDecode(raw) as List<dynamic> : [];
    existing.add(event.toJson());
    await prefs.setString(_manualEventsKey, jsonEncode(existing));

    final allEvents = await listCalendarEvents(user);
    final updated = [...allEvents, event];
    await _saveJsonList(_eventsKey, updated.map((e) => e.toJson()).toList());
  }

  /// 语音转写：发送文本到 Pipeline，返回解析后的事件
  static Future<Map<String, dynamic>> transcribeVoice(String text) async {
    try {
      final result = await ApiService.post(
        '/api/events/voice/transcribe',
        body: {'text': text},
      );
      return result;
    } catch (error) {
      throw Exception('语音识别失败: $error');
    }
  }

  /// 语音转写（音频模式）：发送 base64 音频到 Pipeline
  static Future<Map<String, dynamic>> transcribeVoiceAudio(String audioBase64) async {
    try {
      final result = await ApiService.post(
        '/api/events/voice/transcribe',
        body: {'audio_base64': audioBase64},
      );
      return result;
    } catch (error) {
      throw Exception('语音识别失败: $error');
    }
  }

  /// 批量保存语音创建的事件到后端+RDS
  static Future<List<CalendarEvent>> saveVoiceEvents(
    List<Map<String, dynamic>> calendarEvents,
    AppUser user,
  ) async {
    final savedEvents = <CalendarEvent>[];
    try {
      final url = Uri.parse('${AliyunConfig.apiBaseUrl}/api/events/voice');
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'X-API-Key': '2c7397b53a9856109d98c60a47e368b321588ed5263b3807',
      };
      final token = await ApiService.getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.post(
        url,
        headers: headers,
        body: jsonEncode({
          'items': calendarEvents,
          'userId': 1,
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        if (result['items'] != null && result['items'] is List) {
          for (final item in result['items']) {
            savedEvents.add(CalendarEvent.fromJson(item as Map<String, dynamic>));
          }
        }
        final prefs = await _prefs;
        final raw = prefs.getString(_eventsKey);
        final List<dynamic> existing =
            raw != null ? jsonDecode(raw) as List<dynamic> : [];
        final existingIds = existing.map((e) {
          final json = e as Map<String, dynamic>;
          return json['id'] as String? ?? '';
        }).toSet();
        for (final ev in savedEvents) {
          if (!existingIds.contains(ev.id)) {
            existing.add(ev.toJson());
          }
        }
        await prefs.setString(_eventsKey, jsonEncode(existing));
        return savedEvents;
      }
      throw Exception('保存失败: ${response.statusCode}');
    } catch (_) {
      for (final ce in calendarEvents) {
        final event = CalendarEvent(
          id: _randomId(),
          title: ce['title'] as String? ?? '',
          description: ce['description'] as String?,
          provider: ce['provider'] as String? ?? 'manual',
          startAt: ce['startAt'] as String? ?? '',
          endAt: ce['endAt'] as String? ?? '',
          location: ce['location'] as String?,
          ownerEmail: ce['ownerEmail'] as String? ?? user.email ?? user.id,
        );
        await _saveEventLocally(event, user);
        savedEvents.add(event);
      }
    }
    return savedEvents;
  }

  /// 更新事件
  static Future<CalendarEvent> updateEvent(
    String eventId, {
    String? title,
    String? description,
    DateTime? startAt,
    DateTime? endAt,
    String? location,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (title != null) body['title'] = title;
      if (description != null) body['description'] = description;
      if (startAt != null) body['startAt'] = startAt.toIso8601String();
      if (endAt != null) body['endAt'] = endAt.toIso8601String();
      if (location != null) body['location'] = location;

      final result = await ApiService.put('/api/events/$eventId', body: body);

      return CalendarEvent(
        id: (result['id'] ?? '').toString(),
        title: result['title'] as String? ?? '',
        description: result['description'] as String?,
        provider: result['provider'] as String? ?? 'manual',
        startAt: result['start_at'] as String? ?? '',
        endAt: result['end_at'] as String? ?? '',
        location: result['location'] as String?,
        ownerEmail: '',
      );
    } catch (error) {
      throw Exception('更新事件失败: $error');
    }
  }

  /// 删除事件
  static Future<void> deleteEvent(String eventId) async {
    try {
      await ApiService.delete('/api/events/$eventId');
    } catch (error) {
      throw Exception('删除事件失败: $error');
    }
  }

  /// 获取日历事件列表/// 获取日历事件列表
  static Future<List<CalendarEvent>> listCalendarEvents(AppUser user) async {
    try {
      final result = await ApiService.get('/api/events');
      final items = result['items'] as List<dynamic>? ?? [];
      final events = items
          .map((item) => CalendarEvent.fromJson(item as Map<String, dynamic>))
          .toList();

      // 本地缓存
      await _saveJsonList(_eventsKey, events.map((e) => e.toJson()).toList());
      return events;
    } catch (_) {
      // 回退到本地缓存
      final prefs = await _prefs;
      final raw = prefs.getString(_eventsKey);
      if (raw == null) return [];
      try {
        final decoded = jsonDecode(raw) as List<dynamic>;
        return decoded
            .map((item) => CalendarEvent.fromJson(item as Map<String, dynamic>))
            .toList();
      } catch (_) {
        return [];
      }
    }
  }

  /// 获取日历同步状态
  static Future<Map<String, dynamic>?> getCalendarSyncStatus(
      AppUser user, String provider) async {
    try {
      final result =
          await ApiService.get('/api/events/sync-status', withAuth: true);
      return result;
    } catch (_) {
      return null;
    }
  }

  // ==========================================
  // 工具方法
  // ==========================================

  static Future<void> _saveJsonList(String key, List<Object?> value) async {
    final prefs = await _prefs;
    await prefs.setString(key, jsonEncode(value));
  }
}
