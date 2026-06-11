import 'dart:convert';
import 'dart:html' as html;

import 'package:http/http.dart' as http;

/// 天气数据模型
class WeatherData {
  final String cityName;
  final String country;
  final String tempC;
  final String feelsLikeC;
  final String humidity;
  final String windSpeedKmph;
  final String description;
  final String weatherCode;
  final double lat;
  final double lng;

  WeatherData({
    required this.cityName,
    required this.country,
    required this.tempC,
    required this.feelsLikeC,
    required this.humidity,
    required this.windSpeedKmph,
    required this.description,
    required this.weatherCode,
    required this.lat,
    required this.lng,
  });

  factory WeatherData.fromWttrJson(
      Map<String, dynamic> json, double lat, double lng) {
    final current = json['current_condition']?[0] as Map<String, dynamic>?;
    final area = json['nearest_area']?[0] as Map<String, dynamic>?;

    return WeatherData(
      cityName: area?['areaName']?[0]?['value'] as String? ?? '未知位置',
      country: area?['country']?[0]?['value'] as String? ?? '',
      tempC: current?['temp_C'] as String? ?? '--',
      feelsLikeC: current?['FeelsLikeC'] as String? ?? '--',
      humidity: current?['humidity'] as String? ?? '--',
      windSpeedKmph: current?['windspeedKmph'] as String? ?? '--',
      description: current?['weatherDesc']?[0]?['value'] as String? ?? '未知',
      weatherCode: current?['weatherCode'] as String? ?? '113',
      lat: lat,
      lng: lng,
    );
  }

  /// 根据天气代码返回对应的 Material Icons 名称
  String get weatherIcon {
    final code = int.tryParse(weatherCode);
    if (code == null) return 'wb_sunny';
    return switch (code) {
      113 => 'wb_sunny',
      116 => 'wb_cloudy',
      119 || 122 => 'cloud',
      143 || 248 || 260 => 'foggy',
      176 || 263 || 266 || 281 || 284 || 293 || 296 || 353 => 'grain',
      299 || 302 || 305 || 308 || 356 || 359 => 'umbrella',
      179 || 182 || 185 || 227 || 230 || 311 || 314 || 317 ||
      320 || 323 || 326 || 329 || 332 || 335 || 338 || 350 ||
      362 || 365 || 368 || 371 || 374 || 377 || 392 || 395 =>
          'ac_unit',
      200 || 386 || 389 => 'thunderstorm',
      _ => 'wb_sunny',
    };
  }
}

/// 天气服务 — 获取浏览器位置 + 查询天气
class WeatherService {
  /// 请求浏览器定位权限，获取当前位置坐标
  /// 返回 [lat, lng]
  static Future<List<double>> getCurrentPosition() async {
    final geo = html.window.navigator.geolocation;
    if (geo == null) {
      throw Exception('浏览器不支持定位功能');
    }

    // getCurrentPosition 是 Future<Geoposition>，用命名参数
    final position = await geo.getCurrentPosition(
      enableHighAccuracy: true,
      timeout: const Duration(seconds: 15),
    );

    final c = position.coords;
    final lat = (c?.latitude ?? 0.0).toDouble();
    final lng = (c?.longitude ?? 0.0).toDouble();
    if (lat == 0.0 && lng == 0.0) {
      throw Exception('无法获取坐标信息');
    }
    return [lat, lng];
  }

  /// 通过坐标查询天气（使用 wttr.in，免费无需 API Key）
  static Future<WeatherData> fetchWeather(double lat, double lng) async {
    final url = Uri.parse('https://wttr.in/$lat,$lng?format=j1');
    final response = await http.get(
      url,
      headers: {'Accept': 'application/json'},
    );

    if (response.statusCode != 200) {
      throw Exception('天气查询失败 (${response.statusCode})');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return WeatherData.fromWttrJson(json, lat, lng);
  }

  /// 一键获取：请求定位 → 查天气
  static Future<WeatherData> getCurrentWeather() async {
    final pos = await getCurrentPosition();
    return fetchWeather(pos[0], pos[1]);
  }
}
