class CalendarProviderState {
  final String provider;
  final String label;
  final bool connected;
  final String? lastSyncedAt;
  final String? authUrl;

  CalendarProviderState({
    required this.provider,
    required this.label,
    required this.connected,
    this.lastSyncedAt,
    this.authUrl,
  });

  factory CalendarProviderState.fromJson(Map<String, dynamic> json) {
    return CalendarProviderState(
      provider: json['provider'] as String? ?? '',
      label: json['label'] as String? ?? '',
      connected: json['connected'] as bool? ?? false,
      lastSyncedAt: json['lastSyncedAt'] as String?,
      authUrl: json['authUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'provider': provider,
      'label': label,
      'connected': connected,
      'lastSyncedAt': lastSyncedAt,
      'authUrl': authUrl,
    };
  }
}
