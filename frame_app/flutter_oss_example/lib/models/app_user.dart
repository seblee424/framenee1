/// 用户模型
///
/// 支持多种登录方式：手机号、邮箱、飞书
class AppUser {
  final String id;
  final String? phone;
  final String? email;
  final String name;
  final String? avatarUrl;
  final String loginProvider; // 'phone', 'email', 'dingtalk'
  final bool feishuCalendarConnected;

  AppUser({
    required this.id,
    this.phone,
    this.email,
    required this.name,
    this.avatarUrl,
    this.loginProvider = 'phone',
    this.feishuCalendarConnected = false,
  });

  /// 是否有手机号
  bool get hasPhone => phone != null && phone!.isNotEmpty;

  /// 是否有邮箱
  bool get hasEmail => email != null && email!.isNotEmpty;

  /// 是否连接了日历
  bool get hasCalendarConnected => feishuCalendarConnected;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String? ?? '',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      name: json['name'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      loginProvider: json['login_provider'] as String? ?? 'phone',
      feishuCalendarConnected:
          json['feishu_calendar_connected'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'email': email,
      'name': name,
      'avatar_url': avatarUrl,
      'login_provider': loginProvider,
      'feishu_calendar_connected': feishuCalendarConnected,
    };
  }

  AppUser copyWith({
    String? id,
    String? phone,
    String? email,
    String? name,
    String? avatarUrl,
    String? loginProvider,
    bool? feishuCalendarConnected,
  }) {
    return AppUser(
      id: id ?? this.id,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      loginProvider: loginProvider ?? this.loginProvider,
      feishuCalendarConnected:
          feishuCalendarConnected ?? this.feishuCalendarConnected,
    );
  }
}
