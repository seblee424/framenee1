import 'package:flutter/material.dart';

import '../models/app_user.dart';
import '../services/app_backend.dart';
import 'album_tab.dart';
import 'auth_screen.dart';
import 'calendar_tab.dart';
import 'device_tab.dart';
import 'profile_tab.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  AppUser? _user;
  int _selectedIndex = 1;
  bool _isLoadingUser = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  /// 从本地缓存加载用户，如果没有则显示登录界面
  Future<void> _loadUser() async {
    final savedUser = await AppBackend.loadSavedUser();
    if (!mounted) return;
    setState(() {
      _user = savedUser;
      _isLoadingUser = false;
    });
  }

  void _handleLogin(AppUser user) {
    setState(() {
      _user = user;
      _isLoadingUser = false;
      _selectedIndex = 1;
    });
  }

  void _handleLogout() async {
    await AppBackend.logout();
    if (!mounted) return;
    setState(() {
      _user = null;
      _isLoadingUser = false;
      _selectedIndex = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingUser) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_user == null) {
      return AuthScreen(onLogin: _handleLogin);
    }

    final pages = [
      const DeviceTab(),
      CalendarTab(user: _user!),
      AlbumTab(user: _user!),
      ProfileTab(user: _user!, onLogout: _handleLogout),
    ];

    return Scaffold(
      body: SafeArea(
        child: pages[_selectedIndex],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.orange.shade700,
        unselectedItemColor: Colors.grey.shade600,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.devices), label: '设备'),
          BottomNavigationBarItem(
              icon: Icon(Icons.calendar_month), label: '日历'),
          BottomNavigationBarItem(icon: Icon(Icons.photo), label: '相册'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: '我的'),
        ],
      ),
    );
  }
}
