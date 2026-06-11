class CalendarEvent {
  final String id;
  final String title;
  final String? description;
  final String provider;
  final String startAt;
  final String endAt;
  final String? location;
  final String ownerEmail;

  CalendarEvent({
    required this.id,
    required this.title,
    this.description,
    required this.provider,
    required this.startAt,
    required this.endAt,
    this.location,
    required this.ownerEmail,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    // 同时支持 camelCase 和 snake_case
    String? _val(String camel, String snake) =>
        (json[camel] ?? json[snake]) as String?;

    return CalendarEvent(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      provider: json['provider'] as String? ?? 'manual',
      startAt: _val('startAt', 'start_at') ?? '',
      endAt: _val('endAt', 'end_at') ?? '',
      location: json['location'] as String?,
      ownerEmail: _val('ownerEmail', 'owner_email') ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'provider': provider,
      'startAt': startAt,
      'endAt': endAt,
      'location': location,
      'ownerEmail': ownerEmail,
    };
  }
}
