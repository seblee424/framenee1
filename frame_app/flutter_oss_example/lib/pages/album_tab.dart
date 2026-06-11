import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/app_user.dart';
import '../models/media_asset.dart';
import '../services/app_backend.dart';

class AlbumTab extends StatefulWidget {
  final AppUser user;

  const AlbumTab({super.key, required this.user});

  @override
  State<AlbumTab> createState() => _AlbumTabState();
}

class _AlbumTabState extends State<AlbumTab> {
  final ImagePicker _picker = ImagePicker();
  List<MediaAsset> _assets = [];
  bool _isLoading = true;
  bool _isUploading = false;
  String _status = '';

  @override
  void initState() {
    super.initState();
    _loadAssets();
  }

  Future<void> _loadAssets() async {
    try {
      final assets = await AppBackend.listAlbumAssets(widget.user);
      if (!mounted) return;
      setState(() {
        _assets = assets;
        _isLoading = false;
        _status = assets.isEmpty ? '暂无照片，点击下方按钮上传' : '共 ${assets.length} 张照片';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _status = error.toString();
      });
    }
  }

  Future<void> _pickAndUploadImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (pickedFile == null) return;

      setState(() {
        _isUploading = true;
        _status = '正在上传...';
      });

      final bytes = await pickedFile.readAsBytes();
      final fileName = pickedFile.name;

      final asset = await AppBackend.uploadAlbumAsset(
        bytes: bytes,
        fileName: fileName,
        user: widget.user,
      );

      if (!mounted) return;
      setState(() {
        _assets.insert(0, asset);
        _isUploading = false;
        _status = '上传成功';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isUploading = false;
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('选择照片来源',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),
                ListTile(
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.photo_library,
                        color: Colors.orange.shade700),
                  ),
                  title: const Text('从相册选择'),
                  subtitle: const Text('从设备相册中选择照片'),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndUploadImage(ImageSource.gallery);
                  },
                ),
                ListTile(
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.camera_alt, color: Colors.blue.shade700),
                  ),
                  title: const Text('拍照'),
                  subtitle: const Text('使用相机拍摄照片'),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndUploadImage(ImageSource.camera);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('相册',
                    style:
                        TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                if (_isUploading)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(_status,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
            const SizedBox(height: 16),

            // Photo grid
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _assets.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.photo_library,
                                  size: 64, color: Colors.grey.shade300),
                              const SizedBox(height: 16),
                              Text('暂无照片',
                                  style: TextStyle(
                                      color: Colors.grey.shade500,
                                      fontSize: 16)),
                              const SizedBox(height: 8),
                              Text('点击下方按钮上传第一张照片',
                                  style: TextStyle(
                                      color: Colors.grey.shade400,
                                      fontSize: 13)),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadAssets,
                          child: GridView.builder(
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                            ),
                            itemCount: _assets.length,
                            itemBuilder: (context, index) {
                              final asset = _assets[index];
                              return _buildPhotoItem(asset, index);
                            },
                          ),
                        ),
            ),

            // Upload button
            if (!_isLoading)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isUploading ? null : _showImageSourceDialog,
                    icon: Icon(
                      _isUploading
                          ? Icons.hourglass_top
                          : Icons.add_photo_alternate,
                    ),
                    label: Text(_isUploading ? '上传中...' : '上传照片'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.orange.shade700,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoItem(MediaAsset asset, int index) {
    // 使用后端代理加载图片（避免 OSS CORS 问题）
    final imageUrl = 'http://localhost:3000/api/photos/image/${asset.id}';
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            imageUrl,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                color: Colors.grey.shade200,
                child:
                    Icon(Icons.broken_image, color: Colors.grey.shade400, size: 32),
              );
            },
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                color: Colors.grey.shade100,
                child: const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              );
            },
          ),
        ),
        // 删除按钮
        Positioned(
          top: 4,
          right: 4,
          child: GestureDetector(
            onTap: () => _confirmDelete(asset, index),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, color: Colors.white, size: 14),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmDelete(MediaAsset asset, int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除照片'),
        content: Text('确定要删除 "${asset.fileName}" 吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await AppBackend.deleteAlbumAsset(asset.id);
        if (!mounted) return;
        setState(() {
          _assets.removeAt(index);
          _status = '已删除';
        });
      } catch (error) {
        if (!mounted) return;
        setState(() {
          _status = error.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }
}
