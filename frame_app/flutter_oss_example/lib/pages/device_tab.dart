import 'dart:async';

import 'package:flutter/material.dart';

import '../services/weather_service.dart';

class DeviceTab extends StatefulWidget {
  const DeviceTab({super.key});

  @override
  State<DeviceTab> createState() => _DeviceTabState();
}

class _DeviceTabState extends State<DeviceTab> {
  /// 天气加载状态
  bool _isLoading = false;
  bool _hasRequested = false;
  String? _errorMessage;
  WeatherData? _weather;

  /// 触发定位 + 天气查询
  Future<void> _requestWeather() async {
    setState(() {
      _isLoading = true;
      _hasRequested = true;
      _errorMessage = null;
    });

    try {
      final weather = await WeatherService.getCurrentWeather();
      if (!mounted) return;
      setState(() {
        _weather = weather;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('天气'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: _buildBody(theme),
      ),
    );
  }

  Widget _buildBody(ThemeData theme) {
    // 1. 从未请求定位 → 显示引导页
    if (!_hasRequested) {
      return _buildWelcomeCard(theme);
    }

    // 2. 正在加载
    if (_isLoading) {
      return _buildLoadingState(theme);
    }

    // 3. 出错了
    if (_errorMessage != null) {
      return _buildErrorState(theme);
    }

    // 4. 成功获取天气
    if (_weather != null) {
      return _buildWeatherDisplay(theme);
    }

    // fallback
    return _buildWelcomeCard(theme);
  }

  /// 引导页面 — 点击按钮请求定位权限
  Widget _buildWelcomeCard(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.location_searching,
              size: 72,
              color: theme.colorScheme.primary.withValues(alpha: 0.6),
            ),
            const SizedBox(height: 24),
            Text(
              '查看本地天气',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '启用位置权限后，可以查看您所在位置的实时天气信息',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey.shade600,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton.icon(
                onPressed: _requestWeather,
                icon: const Icon(Icons.my_location),
                label: const Text('允许定位并查看天气',
                    style: TextStyle(fontSize: 16)),
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '浏览器会弹出定位权限请求，请选择"允许"',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 加载中
  Widget _buildLoadingState(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(strokeWidth: 3),
          ),
          const SizedBox(height: 24),
          Text(
            '正在获取位置…',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '请允许浏览器定位权限',
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.grey.shade400,
            ),
          ),
        ],
      ),
    );
  }

  /// 错误状态 — 可重试
  Widget _buildErrorState(ThemeData theme) {
    final isDenied = _errorMessage?.contains('拒绝') ?? false;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isDenied ? Icons.location_off : Icons.cloud_off,
              size: 64,
              color: Colors.orange.shade300,
            ),
            const SizedBox(height: 20),
            Text(
              isDenied ? '定位权限被拒绝' : '获取天气失败',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _errorMessage ?? '未知错误',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 24),
            if (isDenied)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  '请在浏览器地址栏左侧的🔒图标中开启位置权限',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.grey.shade500,
                  ),
                ),
              ),
            SizedBox(
              width: 200,
              height: 44,
              child: OutlinedButton.icon(
                onPressed: _requestWeather,
                icon: const Icon(Icons.refresh),
                label: const Text('重试'),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 天气展示卡片
  Widget _buildWeatherDisplay(ThemeData theme) {
    final w = _weather!;
    // 天气图标映射到 Material Icons
    final iconMap = <String, IconData>{
      'wb_sunny': Icons.wb_sunny,
      'wb_cloudy': Icons.wb_cloudy,
      'cloud': Icons.cloud,
      'foggy': Icons.foggy,
      'grain': Icons.grain,
      'ac_unit': Icons.ac_unit,
      'thunderstorm': Icons.thunderstorm,
      'umbrella': Icons.umbrella,
    };

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ====== 主天气卡片 ======
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: LinearGradient(
                  colors: [
                    theme.colorScheme.primaryContainer,
                    theme.colorScheme.primary.withValues(alpha: 0.15),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
              child: Column(
                children: [
                  // 天气大图标
                  Icon(
                    iconMap[w.weatherIcon] ?? Icons.wb_sunny,
                    size: 72,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 8),
                  // 温度
                  Text(
                    '${w.tempC}°C',
                    style: theme.textTheme.displayMedium?.copyWith(
                      fontWeight: FontWeight.w300,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // 天气描述
                  Text(
                    w.description,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // 城市 + 坐标
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.location_on, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        w.country.isNotEmpty ? '${w.cityName}, ${w.country}' : w.cityName,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // ====== 详细数据网格 ======
          Row(
            children: [
              Expanded(child: _buildInfoTile(theme, '体感温度', '${w.feelsLikeC}°C', Icons.thermostat)),
              const SizedBox(width: 12),
              Expanded(child: _buildInfoTile(theme, '湿度', '${w.humidity}%', Icons.water_drop)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildInfoTile(theme, '风速', '${w.windSpeedKmph} km/h', Icons.air)),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoTile(
                  theme,
                  '坐标',
                  '${w.lat.toStringAsFixed(2)}, ${w.lng.toStringAsFixed(2)}',
                  Icons.explore,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // ====== 刷新按钮 ======
          SizedBox(
            height: 44,
            child: OutlinedButton.icon(
              onPressed: _isLoading ? null : _requestWeather,
              icon: Icon(
                Icons.refresh,
                size: 20,
                color: _isLoading ? null : theme.colorScheme.primary,
              ),
              label: Text(_isLoading ? '刷新中…' : '刷新天气'),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),

          const SizedBox(height: 40),

          // ====== 底部提示 ======
          Center(
            child: Text(
              '数据来源: wttr.in',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade400,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 信息格子
  Widget _buildInfoTile(
      ThemeData theme, String label, String value, IconData icon) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
        child: Column(
          children: [
            Icon(icon, size: 24, color: theme.colorScheme.primary),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
