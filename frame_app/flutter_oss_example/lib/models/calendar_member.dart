class CalendarMember {
  final String id;
  final String email;
  final String name;
  final String role;
  final String status;
  final String invitedAt;

  CalendarMember({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.status,
    required this.invitedAt,
  });

  factory CalendarMember.fromJson(Map<String, dynamic> json) {
    return CalendarMember(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'member',
      status: json['status'] as String? ?? 'pending',
      invitedAt: json['invitedAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'status': status,
      'invitedAt': invitedAt,
    };
  }
}
