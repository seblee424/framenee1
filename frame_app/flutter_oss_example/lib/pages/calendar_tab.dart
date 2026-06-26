import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:html' as html;
import 'dart:js' as js;
import 'dart:js_util' as js_util;

import '../models/app_user.dart';
import '../models/calendar_event.dart';
import '../models/calendar_member.dart';
import '../services/app_backend.dart';
import '../services/weather_service.dart';
import '../config/aliyun_config.dart';

class CalendarTab extends StatefulWidget {
  final AppUser user;

  const CalendarTab({super.key, required this.user});

  @override
  State<CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<CalendarTab> {
  final _inviteController = TextEditingController();
  List<CalendarEvent> _events = [];
  List<CalendarMember> _members = [];
  bool _isLoading = true;
  bool _isSyncingFeishu = false;
  bool _isSyncingLocal = false;
  bool _isInviting = false;
  bool _feishuConnected = false;
  bool _checkingConnection = true;
  String _status = '准备就绪';
  DateTime _selectedDate = DateTime.now();
  bool _isMonthView = false;
  DateTime _viewMonth = DateTime(DateTime.now().year, DateTime.now().month);

  // 天气状态
  WeatherData? _weather;
  bool _weatherLoading = false;
  String? _weatherError;

  @override
  void initState() {
    super.initState();
    _loadData();
    _checkConnections();
    _fetchWeather();
  }

  @override
  void dispose() {
    _inviteController.dispose();
    super.dispose();
  }

  Future<void> _checkConnections() async {
    try {
      // 检查是否刚完成飞书授权回调
      final justConnected = html.window.localStorage['feishu_just_connected'];
      if (justConnected == 'true') {
        html.window.localStorage.remove('feishu_just_connected');
        setState(() {
          _feishuConnected = true;
          _checkingConnection = false;
        });
        return;
      }

      // 记录当前使用的 API 地址（方便调试）
      print('[FrameNe] _checkConnections: apiBaseUrl=${AliyunConfig.apiBaseUrl}');
      
      final feishuOk =
          await AppBackend.isFeishuConnected(widget.user);
      if (!mounted) return;
      print('[FrameNe] 连接状态: dingtalk=$feishuOk');
      setState(() {
        _feishuConnected = feishuOk;
        _checkingConnection = false;
      });
    } catch (e) {
      print('[FrameNe] 检查连接失败: $e');
      if (!mounted) return;
      setState(() {
        _checkingConnection = false;
      });
      // 5秒后重试一次（可能 API 还没就绪）
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted) _checkConnections();
      });
    }
  }

  Future<void> _loadData() async {
    try {
      final events = await AppBackend.listCalendarEvents(widget.user);
      final members = await AppBackend.listCalendarMembers(widget.user);
      if (!mounted) return;
      setState(() {
        _events = events;
        _members = members;
        _status = events.isEmpty ? '点击同步加载日历事件' : '已加载 ${events.length} 个事件';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = error.toString();
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// 获取当前天气（静默加载，失败不阻塞 UI）
  Future<void> _fetchWeather() async {
    setState(() {
      _weatherLoading = true;
      _weatherError = null;
    });
    try {
      final weather = await WeatherService.getCurrentWeather();
      if (!mounted) return;
      setState(() {
        _weather = weather;
        _weatherLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _weatherError = e.toString().replaceFirst('Exception: ', '');
        _weatherLoading = false;
      });
    }
  }

  /// 启动语音识别（只填写文本框，不自动创建）
  void _startVoiceRecognition() async {
    try {
      _voiceController.clear();

      // 请求麦克风权限
      try {
        await js_util.promiseToFuture(
          js_util.callMethod(
            js_util.getProperty(html.window.navigator, 'mediaDevices'),
            'getUserMedia',
            [js_util.jsify({'audio': true})],
          ),
        );
      } catch (permError) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('请在地址栏开启麦克风权限后重试'), backgroundColor: Colors.red),
          );
        }
        return;
      }

      // 检查 SpeechRecognition
      final srCtor = js_util.getProperty(html.window, 'webkitSpeechRecognition') ??
                      js_util.getProperty(html.window, 'SpeechRecognition');
      if (srCtor == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('您的浏览器暂不支持语音识别')),
          );
        }
        return;
      }

      final recognition = js_util.callConstructor(srCtor, []);
      js_util.setProperty(recognition, 'lang', 'zh-CN');
      js_util.setProperty(recognition, 'continuous', false);
      js_util.setProperty(recognition, 'interimResults', true);

      String spokenText = '';

      js_util.setProperty(recognition, 'onresult', js.allowInterop((event) {
        String finalText = '';
        final results = js_util.getProperty(event, 'results');
        final length = js_util.getProperty(results, 'length') as int;
        for (int i = 0; i < length; i++) {
          final result = js_util.getProperty(results, i);
          final transcript = js_util.getProperty(
            js_util.getProperty(result, 0), 'transcript',
          ) as String? ?? '';
          if (js_util.getProperty(result, 'isFinal') == true) {
            finalText += transcript;
          }
        }
        if (finalText.isNotEmpty) {
          spokenText = finalText;
          // 实时显示到文本框
          _voiceController.text = spokenText;
          _voiceController.selection = TextSelection.fromPosition(
            TextPosition(offset: spokenText.length),
          );
        }
      }));

      js_util.setProperty(recognition, 'onend', js.allowInterop((event) {
        // 语音结束，文字已填入文本框，用户按回车即可解析
      }));

      js_util.callMethod(recognition, 'start', []);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('语音识别启动失败: $e')),
        );
      }
    }
  }

  /// 处理文字发送：直接解析并创建日程，无预览弹窗
  Future<void> _handleVoiceSend() async {
    final text = _voiceController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isProcessingVoice = true);
    try {
      final result = await AppBackend.transcribeVoice(text);
      final calendarEvents = result['calendarEvents'] as List<dynamic>? ?? [];
      if (calendarEvents.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('未能解析出日程事件，请重新描述')),
          );
        }
        return;
      }

      // 直接保存，不弹预览
      final events = calendarEvents.cast<Map<String, dynamic>>();
      final saved = await AppBackend.saveVoiceEvents(events, widget.user);
      if (mounted) {
        if (saved.isNotEmpty) {
          final firstDate = DateTime.parse(saved.first.startAt).toLocal();
          setState(() {
            _selectedDate = DateTime(firstDate.year, firstDate.month, firstDate.day);
            _viewMonth = DateTime(firstDate.year, firstDate.month);
          });
        }
        _loadData();
        _voiceController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('解析录入成功 ✅'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('处理失败: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessingVoice = false);
    }
  }

  /// 显示日程预览弹窗（类似 Web 端样式）
  void _showEventPreview(List<Map<String, dynamic>> events) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 顶部：AI 标识 + 已识别数量
              Row(
                children: [
                  const Icon(Icons.auto_awesome, color: Colors.blue, size: 20),
                  const SizedBox(width: 6),
                  Text(
                    '已识别 ${events.length} 个日程',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // 日程卡片列表
              ...events.map((event) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event['title'] as String? ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatTimeRange(event['startAt'] as String?, event['endAt'] as String?),
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                  ],
                ),
              )),
              const SizedBox(height: 16),
              // 底部按钮
              Row(
                children: [
                  Expanded(
                    flex: 5,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        setState(() => _isProcessingVoice = true);
                        try {
                          final saved = await AppBackend.saveVoiceEvents(events, widget.user);
                          if (saved.isNotEmpty && mounted) {
                            final firstDate = DateTime.parse(saved.first.startAt);
                            setState(() {
                              _selectedDate = firstDate;
                              _viewMonth = DateTime(firstDate.year, firstDate.month);
                            });
                            _loadData();
                            _voiceController.clear();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('解析录入成功 ✅'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          } else if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('创建失败，请先登录后再试'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('创建失败: $e')),
                            );
                          }
                        } finally {
                          if (mounted) setState(() => _isProcessingVoice = false);
                        }
                      },
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('确认创建'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4A7BF7),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 1,
                    child: GestureDetector(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.close, color: Colors.grey),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  /// 格式化日程时间显示
  String _formatTimeRange(String? startAt, String? endAt) {
    try {
      if (startAt == null) return '';
      // 解析 ISO 时间，自动处理时区
      final start = DateTime.parse(startAt);
      // 如果有时区信息，toLocal() 会正确转换
      final sLocal = startAt.endsWith('Z') || startAt.contains('+') || startAt.contains('-')
          ? start.toLocal()
          : start;
      final startStr = '${sLocal.hour.toString().padLeft(2, '0')}:${sLocal.minute.toString().padLeft(2, '0')}';

      if (endAt != null) {
        final end = DateTime.parse(endAt);
        final eLocal = endAt.endsWith('Z') || endAt.contains('+') || endAt.contains('-')
            ? end.toLocal()
            : end;
        return '${startStr} → ${eLocal.hour.toString().padLeft(2, '0')}:${eLocal.minute.toString().padLeft(2, '0')}';
      }
      return startStr;
    } catch (_) {
      return startAt ?? '';
    }
  }

  /// 同步日程到 Web 端
  Future<void> _syncToWeb() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('正在同步到 Web...')),
    );
    try {
      await AppBackend.syncCalendarToWeb(widget.user, events: _events.map((e) => e.toJson()).toList());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('同步成功 ✅'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('同步失败: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// 删除事件确认弹窗
  Future<void> _confirmDeleteEvent(CalendarEvent event) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除事件'),
        content: Text('确定要删除「${event.title}」吗？\n此操作会同步到阿里云数据库。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await AppBackend.deleteEvent(event.id);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('事件已删除'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      } catch (error) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('删除失败: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _connectFeishuCalendar() async {
    try {
      final authUrl = await AppBackend.getFeishuAuthUrl();
      // 直接跳转（Safari 会拦截弹窗）
      html.window.location.href = authUrl;
      setState(() {
        _status = '正在跳转到飞书授权页面...';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _syncFeishuCalendar() async {
    setState(() {
      _isSyncingFeishu = true;
      _status = '正在同步飞书日历...';
    });

    try {
      final result = await AppBackend.syncFeishuCalendar(widget.user);
      final syncedCount = (result['events_synced'] as num?)?.toInt() ?? 0;
      if (!mounted) return;
      setState(() {
        _feishuConnected = true;
        _status = '已同步 $syncedCount 个飞书日历事件';
      });

      // 重新加载事件
      final events = await AppBackend.listCalendarEvents(widget.user);
      if (!mounted) return;
      setState(() {
        _events = events;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isSyncingFeishu = false;
      });
    }
  }

  Future<void> _syncLocalCalendar() async {
    setState(() {
      _isSyncingLocal = true;
      _status = '正在同步设备日历...';
    });

    try {
      final events = await AppBackend.syncLocalCalendar(widget.user);
      if (!mounted) return;
      setState(() {
        _events = events;
        _status = '已同步 ${events.length} 个设备日历事件';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isSyncingLocal = false;
      });
    }
  }

  Future<void> _showAddEventDialog() async {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    DateTime startDate = DateTime.now();
    DateTime endDate = DateTime.now().add(const Duration(hours: 1));
    TimeOfDay startTime = TimeOfDay.fromDateTime(startDate);
    TimeOfDay endTime = TimeOfDay.fromDateTime(endDate);

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('添加事件'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(
                        labelText: '标题 *',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      decoration: const InputDecoration(
                        labelText: '描述',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: startDate,
                                firstDate: DateTime.now()
                                    .subtract(const Duration(days: 365)),
                                lastDate: DateTime.now()
                                    .add(const Duration(days: 365)),
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  startDate = DateTime(
                                    picked.year,
                                    picked.month,
                                    picked.day,
                                    startTime.hour,
                                    startTime.minute,
                                  );
                                });
                              }
                            },
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: '开始日期',
                                border: OutlineInputBorder(),
                              ),
                              child: Text(
                                '${startDate.year}-${startDate.month.toString().padLeft(2, '0')}-${startDate.day.toString().padLeft(2, '0')}',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showTimePicker(
                                context: context,
                                initialTime: startTime,
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  startTime = picked;
                                  startDate = DateTime(
                                    startDate.year,
                                    startDate.month,
                                    startDate.day,
                                    picked.hour,
                                    picked.minute,
                                  );
                                });
                              }
                            },
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: '开始时间',
                                border: OutlineInputBorder(),
                              ),
                              child: Text(startTime.format(context)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: endDate,
                                firstDate: DateTime.now()
                                    .subtract(const Duration(days: 365)),
                                lastDate: DateTime.now()
                                    .add(const Duration(days: 365)),
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  endDate = DateTime(
                                    picked.year,
                                    picked.month,
                                    picked.day,
                                    endTime.hour,
                                    endTime.minute,
                                  );
                                });
                              }
                            },
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: '结束日期',
                                border: OutlineInputBorder(),
                              ),
                              child: Text(
                                '${endDate.year}-${endDate.month.toString().padLeft(2, '0')}-${endDate.day.toString().padLeft(2, '0')}',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showTimePicker(
                                context: context,
                                initialTime: endTime,
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  endTime = picked;
                                  endDate = DateTime(
                                    endDate.year,
                                    endDate.month,
                                    endDate.day,
                                    picked.hour,
                                    picked.minute,
                                  );
                                });
                              }
                            },
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: '结束时间',
                                border: OutlineInputBorder(),
                              ),
                              child: Text(endTime.format(context)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('取消'),
                ),
                FilledButton(
                  onPressed: () {
                    if (titleController.text.trim().isEmpty) {
                      return;
                    }
                    Navigator.pop(context, {
                      'title': titleController.text.trim(),
                      'description': descriptionController.text.trim(),
                      'startAt': startDate,
                      'endAt': endDate,
                    });
                  },
                  child: const Text('添加'),
                ),
              ],
            );
          },
        );
      },
    );

    if (result == null) return;

    try {
      final event = await AppBackend.addManualEvent(
        user: widget.user,
        title: result['title'] as String,
        description: (result['description'] as String).isEmpty
            ? null
            : result['description'] as String,
        startAt: result['startAt'] as DateTime,
        endAt: result['endAt'] as DateTime,
      );
      if (!mounted) return;
      setState(() {
        _events = [..._events, event];
        _selectedDate = DateTime.tryParse(event.startAt) ?? DateTime.now();
        _viewMonth = DateTime(_selectedDate.year, _selectedDate.month);
        _status = '已添加事件 "${event.title}"';
      });
      _loadData(); // 刷新服务器数据
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = error.toString();
      });
    }
  }

  String _formatHeadline(DateTime date) {
    const months = [
      '1月',
      '2月',
      '3月',
      '4月',
      '5月',
      '6月',
      '7月',
      '8月',
      '9月',
      '10月',
      '11月',
      '12月'
    ];
    return '${months[date.month - 1]} ${date.day}日';
  }

  String _formatEventTime(CalendarEvent event) {
    try {
      // 解析 ISO 时间，自动处理时区
      final start = DateTime.parse(event.startAt);
      final end = DateTime.parse(event.endAt);
      final sLocal = event.startAt.endsWith('Z') || event.startAt.contains('+') || event.startAt.contains('-')
          ? start.toLocal()
          : start;
      final eLocal = event.endAt.endsWith('Z') || event.endAt.contains('+') || event.endAt.contains('-')
          ? end.toLocal()
          : end;
      return '${sLocal.month}/${sLocal.day} ${sLocal.hour.toString().padLeft(2, '0')}:${sLocal.minute.toString().padLeft(2, '0')} - ${eLocal.hour.toString().padLeft(2, '0')}:${eLocal.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return event.startAt;
    }
  }

  String _twoDigits(int value) => value.toString().padLeft(2, '0');

  Future<void> _inviteMember() async {
    final email = _inviteController.text.trim();
    if (email.isEmpty) {
      return;
    }

    setState(() {
      _isInviting = true;
      _status = '邀请中...';
    });

    try {
      final member = await AppBackend.inviteCalendarMember(email, widget.user);
      if (!mounted) return;
      setState(() {
        _members = _members.any((item) => item.email == member.email)
            ? _members
            : [..._members, member];
        _inviteController.clear();
        _status = '已邀请 ${member.name}';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = error.toString();
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isInviting = false;
      });
    }
  }

  Iterable<DateTime> get _weekDays {
    final firstDay =
        _selectedDate.subtract(Duration(days: _selectedDate.weekday % 7));
    return List.generate(7, (index) => firstDay.add(Duration(days: index)));
  }

  Color _eventColor(String provider) {
    switch (provider) {
      case 'google':
        return Colors.grey; // 已弃用
      case 'feishu':
        return Colors.blue.shade700;
      case 'device':
        return Colors.green;
      case 'manual':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _eventIcon(String provider) {
    switch (provider) {
      case 'google':
        return Icons.calendar_today; // 已弃用
      case 'feishu':
        return Icons.chat_bubble_outline;
      case 'device':
        return Icons.phone_android;
      case 'manual':
        return Icons.edit_calendar;
      default:
        return Icons.calendar_today;
    }
  }

  String _eventLabel(String provider) {
    switch (provider) {
      case 'google':
        return '已同步'; // 已弃用
      case 'feishu':
        return '飞书';
      case 'device':
        return '设备';
      case 'manual':
        return '手动';
      default:
        return provider;
    }
  }

  /// 获取某天的事件列表
  List<CalendarEvent> _eventsForDate(DateTime date) {
    return _events.where((event) {
      try {
        final eventDate = DateTime.parse(event.startAt);
        return eventDate.year == date.year &&
            eventDate.month == date.month &&
            eventDate.day == date.day;
      } catch (_) {
        return false;
      }
    }).toList()
      ..sort((a, b) => a.startAt.compareTo(b.startAt));
  }

  /// 获取某天是否有事件
  bool _hasEventOnDate(DateTime date) {
    return _events.any((event) {
      try {
        final eventDate = DateTime.parse(event.startAt);
        return eventDate.year == date.year &&
            eventDate.month == date.month &&
            eventDate.day == date.day;
      } catch (_) {
        return false;
      }
    });
  }

  /// 构建月视图
  Widget _buildMonthView() {
    final firstDay = DateTime(_viewMonth.year, _viewMonth.month, 1);
    final lastDay = DateTime(_viewMonth.year, _viewMonth.month + 1, 0);
    final firstWeekday = firstDay.weekday % 7; // 0=周日, 1=周一, ...
    final daysInMonth = lastDay.day;

    final today = DateTime.now();

    return Column(
      children: [
        // 月份导航
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              onPressed: () {
                setState(() {
                  _viewMonth = DateTime(_viewMonth.year, _viewMonth.month - 1);
                });
              },
              icon: const Icon(Icons.chevron_left),
            ),
            Text(
              '${_viewMonth.year}年${_viewMonth.month}月',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            IconButton(
              onPressed: () {
                setState(() {
                  _viewMonth = DateTime(_viewMonth.year, _viewMonth.month + 1);
                });
              },
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
        const SizedBox(height: 8),
        // 星期头
        Row(
          children: ['日', '一', '二', '三', '四', '五', '六'].map((day) {
            return Expanded(
              child: Center(
                child: Text(day,
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade600)),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 4),
        // 日期网格
        ...List.generate(
          ((firstWeekday + daysInMonth + 6) ~/ 7).toInt(),
          (weekIndex) {
            return Row(
              children: List.generate(7, (weekday) {
                final dayIndex = weekIndex * 7 + weekday - firstWeekday + 1;
                if (dayIndex < 1 || dayIndex > daysInMonth) {
                  return const Expanded(child: SizedBox(height: 44));
                }
                final date =
                    DateTime(_viewMonth.year, _viewMonth.month, dayIndex);
                final isToday = date.year == today.year &&
                    date.month == today.month &&
                    date.day == today.day;
                final isSelected = date.year == _selectedDate.year &&
                    date.month == _selectedDate.month &&
                    date.day == _selectedDate.day;
                final hasEvent = _hasEventOnDate(date);

                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedDate = date;
                      });
                    },
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Colors.orange.shade100
                            : isToday
                                ? Colors.orange.shade50
                                : null,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$dayIndex',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight:
                                  isToday ? FontWeight.bold : FontWeight.normal,
                              color: isSelected
                                  ? Colors.orange.shade800
                                  : isToday
                                      ? Colors.orange
                                      : Colors.black87,
                            ),
                          ),
                          if (hasEvent)
                            Container(
                              width: 5,
                              height: 5,
                              decoration: BoxDecoration(
                                color: Colors.orange.shade400,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            );
          },
        ),
      ],
    );
  }

  /// 构建周视图
  Widget _buildWeekView() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _weekDays.map((day) {
          final selected =
              day.day == _selectedDate.day && day.month == _selectedDate.month;
          final hasEvent = _hasEventOnDate(day);
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              selected: selected,
              label: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                      '${['日', '一', '二', '三', '四', '五', '六'][day.weekday % 7]}',
                      style: const TextStyle(
                          fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text('${day.day}',
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.bold)),
                  if (hasEvent)
                    Container(
                      width: 4,
                      height: 4,
                      margin: const EdgeInsets.only(top: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade400,
                        shape: BoxShape.circle,
                      ),
                    ),
                ],
              ),
              onSelected: (_) {
                setState(() {
                  _selectedDate = day;
                });
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  /// 构建事件列表
  Widget _buildEventList() {
    final upcomingEvents = _eventsForDate(_selectedDate);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(_formatHeadline(_selectedDate),
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(16)),
              child: Text('${upcomingEvents.length} 个事件',
                  style: const TextStyle(color: Colors.orange)),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (_isLoading)
          const Center(child: CircularProgressIndicator())
        else if (upcomingEvents.isEmpty)
          const Center(
              child: Text('暂无事件', style: TextStyle(color: Colors.black54)))
        else
          Column(
            children: upcomingEvents.map((event) {
              final color = _eventColor(event.provider);
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: color.withOpacity(0.2)),
                ),
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(_eventIcon(event.provider), color: color, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(event.title,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold)),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _eventLabel(event.provider),
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: color,
                                      fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(_formatEventTime(event),
                              style: const TextStyle(
                                  color: Colors.black54, fontSize: 12)),
                          if (event.location != null &&
                              event.location!.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(event.location!,
                                style: const TextStyle(
                                    color: Colors.black54, fontSize: 12)),
                          ],
                        ],
                      ),
                    ),
                    // 删除按钮
                    GestureDetector(
                      onTap: () => _confirmDeleteEvent(event),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.delete_outline,
                            color: Colors.red.shade400, size: 18),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  @override
  /// 左上角紧凑天气条
  Widget _buildTopWeather() {
    // 加载中 → 小圆点动画
    if (_weatherLoading && _weather == null) {
      return Row(
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey.shade400),
          ),
          const SizedBox(width: 8),
          Text('定位中…', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        ],
      );
    }

    // 获取失败 → 沉默（下次打开页面会自动重试）
    if (_weatherError != null && _weather == null) {
      return const SizedBox.shrink();
    }

    // 成功获取天气
    if (_weather != null) {
      final w = _weather!;
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
      return GestureDetector(
        onTap: _fetchWeather,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              iconMap[w.weatherIcon] ?? Icons.wb_sunny,
              size: 18,
              color: Colors.orange.shade600,
            ),
            const SizedBox(width: 6),
            Text(
              '${w.tempC}°C',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade800,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              w.cityName,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
            if (_weatherLoading) ...[
              const SizedBox(width: 6),
              SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(
                    strokeWidth: 1.5, color: Colors.grey.shade300),
              ),
            ],
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 左上角天气条
            _buildTopWeather(),
            const SizedBox(height: 8),
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('日历',
                    style:
                        TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 日/月视图切换
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: () {
                              if (_isMonthView) {
                                setState(() => _isMonthView = false);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: !_isMonthView ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: !_isMonthView
                                    ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))]
                                    : null,
                              ),
                              child: Text('日',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: !_isMonthView ? Colors.orange.shade700 : Colors.grey.shade600,
                                  )),
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              if (!_isMonthView) {
                                setState(() => _isMonthView = true);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: _isMonthView ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: _isMonthView
                                    ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))]
                                    : null,
                              ),
                              child: Text('月',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: _isMonthView ? Colors.orange.shade700 : Colors.grey.shade600,
                                  )),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: _showAddEventDialog,
                      icon: const Icon(Icons.add_circle_outline),
                      tooltip: '添加事件',
                      color: Colors.orange,
                    ),
                    const SizedBox(width: 4),
                    // 日历设置（右上角手机图标）
                    IconButton(
                      onPressed: _showCalendarSettings,
                      icon: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          const Icon(Icons.phone_android),
                          if (_feishuConnected)
                            Positioned(
                              right: -4,
                              top: -2,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: Colors.green,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      ),
                      tooltip: '日历设置',
                      color: Colors.grey.shade700,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 日历连接状态已移至右上角弹窗

            // Members section
            Container(
              decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200)),
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Text('成员',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                  ..._members.take(3).map(
                        (member) => Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: CircleAvatar(
                            radius: 18,
                            backgroundColor: Colors.grey.shade200,
                            child: Text(
                                member.name.isNotEmpty
                                    ? member.name[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(color: Colors.black87)),
                          ),
                        ),
                      ),
                  if (_members.length > 3)
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: CircleAvatar(
                        radius: 18,
                        backgroundColor: Colors.orange.shade100,
                        child: const Icon(Icons.add,
                            size: 18, color: Colors.orange),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Invite section
            Container(
              decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200)),
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inviteController,
                      decoration: const InputDecoration(
                          border: OutlineInputBorder(), hintText: '通过邮箱邀请'),
                      keyboardType: TextInputType.emailAddress,
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isInviting ? null : _inviteMember,
                    style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            vertical: 16, horizontal: 18),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18))),
                    child: Text(_isInviting ? '...' : '邀请'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // 日历视图 + 事件列表
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  Container(
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade200)),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 月视图或周视图
                        if (_isMonthView)
                          _buildMonthView()
                        else
                          _buildWeekView(),
                        const SizedBox(height: 18),
                        // 事件列表
                        _buildEventList(),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Legend
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _legendItem(Colors.blue.shade700, '飞书'),
                        _legendItem(Colors.green, '设备'),
                        _legendItem(Colors.orange, '手动'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text('状态: $_status',
                      style:
                          const TextStyle(color: Colors.black54, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
      // 底部语音输入栏
      bottomNavigationBar: Container(
        padding: EdgeInsets.only(
          left: 12,
          right: 12,
          top: 8,
          bottom: MediaQuery.of(context).padding.bottom + 8,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Row(
          children: [
            // 左侧：蓝色圆形麦克风按钮
            GestureDetector(
              onTap: () => _startVoiceRecognition(),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFF4A7BF7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.mic, color: Colors.white, size: 22),
              ),
            ),
            const SizedBox(width: 10),
            // 右侧：圆角输入框
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: TextField(
                  controller: _voiceController,
                  decoration: const InputDecoration(
                    hintText: '点击 🎤 说话，或直接输入日程描述',
                    hintStyle: TextStyle(color: Colors.grey, fontSize: 14),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 10),
                  ),
                  maxLines: 1,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _handleVoiceSend(),
                ),
              ),
            ),
            const SizedBox(width: 6),
            // 右侧：发送按钮（有文字时才显示）
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: _voiceController,
              builder: (context, value, child) {
                final hasText = value.text.trim().isNotEmpty;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: hasText ? 44 : 0,
                  height: 44,
                  child: hasText
                      ? GestureDetector(
                          onTap: _isProcessingVoice ? null : _handleVoiceSend,
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: const Color(0xFF4A7BF7),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: _isProcessingVoice
                                ? const Padding(
                                    padding: EdgeInsets.all(12),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  )
                                : const Icon(Icons.send, color: Colors.white, size: 20),
                          ),
                        )
                      : const SizedBox.shrink(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  /// 语音输入文本控制器
  final _voiceController = TextEditingController();
  bool _isProcessingVoice = false;


  /// 弹出日历设置弹窗（飞书连接）
  void _showCalendarSettings() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Text('日历同步设置',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('连接你的日历账号，同步日程事件',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
              const SizedBox(height: 20),
              // 飞书日历
              _buildSettingsItem(
                icon: Icons.chat_bubble_outline,
                title: '飞书日历',
                subtitle: _feishuConnected ? '已连接' : '未连接',
                color: Colors.blue.shade700,
                connected: _feishuConnected,
                syncing: _isSyncingFeishu,
                onConnect: () {
                  Navigator.pop(context);
                  _connectFeishuCalendar();
                },
                onSync: () {
                  Navigator.pop(context);
                  _syncFeishuCalendar();
                },
              ),
              const SizedBox(height: 16),
              // 重新授权飞书日历
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _connectFeishuCalendar();
                  },
                  icon: Icon(Icons.refresh, size: 18, color: Colors.blue.shade600),
                  label: Text('重新授权飞书日历', style: TextStyle(color: Colors.blue.shade700)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: BorderSide(color: Colors.blue.shade200),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // 日程同步到 Web 端
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _syncToWeb();
                  },
                  icon: const Icon(Icons.cloud_upload, size: 18),
                  label: const Text('日程同步到web端'),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: Colors.blue.shade50,
                    foregroundColor: Colors.blue.shade700,
                    side: BorderSide(color: Colors.blue.shade300),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// 构建日历设置项（弹窗内使用）
  Widget _buildSettingsItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required bool connected,
    required bool syncing,
    required VoidCallback onConnect,
    required VoidCallback onSync,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: connected ? color.withOpacity(0.05) : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: connected ? color.withOpacity(0.2) : Colors.grey.shade200,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 2),
                Text(subtitle,
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
              ],
            ),
          ),
          if (connected)
            TextButton(
              onPressed: syncing ? null : onSync,
              style: TextButton.styleFrom(foregroundColor: color),
              child: syncing
                  ? const SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('同步', style: TextStyle(fontSize: 13)),
            )
          else
            ElevatedButton(
              onPressed: onConnect,
              style: ElevatedButton.styleFrom(
                backgroundColor: color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Text('连接', style: TextStyle(fontSize: 13)),
            ),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
      ],
    );
  }
}
