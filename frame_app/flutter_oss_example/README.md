# Flutter OSS 上传示例

这个目录是一套可以直接拷进 Flutter 项目的最小示例，实现了：

- `dio` 二进制 `PUT` 上传到阿里云 OSS
- `image_picker` 选图
- `OssService.uploadImage(File file)` 返回图片绝对 URL
- 自动文件名：`calendar/images/UUID_时间戳.jpg`
- 成功后可选拼接 `?x-oss-process=image/resize,w_500`
- 上传中 `Loading`、失败错误回显、成功后 `Image.network` 展示

## 目录结构

- `lib/config/secrets.dart`
- `lib/services/oss_service.dart`
- `lib/pages/oss_upload_demo_page.dart`
- `lib/main.dart`

## 依赖安装

```bash
flutter pub add dio image_picker path_provider crypto
```

## 配置

编辑 `lib/config/secrets.dart`：

```dart
const String ossAccessKeyId = '你的ID';
const String ossAccessKeySecret = '你的Secret';
const String ossBucketName = '你的Bucket名称';
const String ossEndpoint = 'oss-cn-hongkong.aliyuncs.com';
```

### Supabase 初始化示例

如果你希望使用 Supabase 进行身份认证、设备绑定和日程同步，可使用以下文件：

- `lib/supabase_main.dart`
- `lib/config/supabase_env.dart`
- `lib/services/supabase_service.dart`
- `lib/pages/supabase_demo_page.dart`

在 `flutter_oss_example` 目录里，先安装依赖：

```bash
flutter pub get
```

创建 `flutter_oss_example/.env`，并添加：

```env
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

你也可以先复制 `flutter_oss_example/.env.example` 为 `flutter_oss_example/.env`。

然后使用 `flutter run -t lib/supabase_main.dart` 启动 Supabase 示例。

## FrameNe 本地 Flutter UI

`lib/main.dart` 已经支持读取 `flutter_oss_example/.env` 并初始化 Supabase，
如果你已配置 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY`，主应用将自动使用 Supabase 数据库。

我们已将当前 `src/` 目录中的 React 页面翻译为 Flutter/Dart 版本，入口文件已改为：

- `lib/main.dart`
- `lib/framene_app.dart`
- `lib/pages/home_page.dart`
- `lib/pages/auth_screen.dart`
- `lib/pages/device_tab.dart`
- `lib/pages/calendar_tab.dart`
- `lib/pages/album_tab.dart`
- `lib/pages/profile_tab.dart`
- `lib/services/app_backend.dart`
- `lib/models/*.dart`

运行新 Flutter UI：

```bash
flutter pub get
flutter run
```

## 接入说明

1. 把 `lib/services/oss_service.dart` 拷到你的 Flutter 项目。
2. 在上传按钮事件里调用 `ImagePicker` 选图。
3. 调用 `OssService().uploadImage(File(path))`。
4. 拿到返回的 `imageUrl` 后直接用于 `Image.network(imageUrl)`。

## 注意事项

- 这是临时调试方案，`AccessKeySecret` 不建议长期放在客户端。
- 生产环境更推荐由你自己的服务端签名，或下发 STS 临时凭证。
- 如果 Bucket 没有公共读权限，`Image.network` 可能无法直接显示。
