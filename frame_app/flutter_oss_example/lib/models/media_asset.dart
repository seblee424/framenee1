class MediaAsset {
  final String id;
  final String type;
  final String url;
  final String fileName;
  final String createdAt;
  final String uploadedBy;
  final String? storagePath;

  MediaAsset({
    required this.id,
    required this.type,
    required this.url,
    required this.fileName,
    required this.createdAt,
    required this.uploadedBy,
    this.storagePath,
  });

  bool get isLocalFile => url.startsWith('/') || url.startsWith('file://');

  factory MediaAsset.fromJson(Map<String, dynamic> json) {
    return MediaAsset(
      id: (json['id'] ?? '').toString(),
      type: json['type'] as String? ?? 'photo',
      url: json['url'] as String? ?? '',
      // Support both camelCase (local) and snake_case field names
      fileName: (json['fileName'] ?? json['file_name'] ?? '').toString(),
      createdAt: (json['createdAt'] ?? json['created_at'] ?? '').toString(),
      uploadedBy: (json['uploadedBy'] ?? json['uploaded_by'] ?? '').toString(),
      storagePath: (json['storagePath'] ?? json['storage_path'])?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'url': url,
      'fileName': fileName,
      'createdAt': createdAt,
      'uploadedBy': uploadedBy,
      'storagePath': storagePath,
    };
  }
}
