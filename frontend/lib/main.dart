import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:url_strategy/url_strategy.dart';
import 'config/theme.dart';
import 'navigation/app_router.dart';

void main() {
  setPathUrlStrategy();
  runApp(const VisInfoApp());
}

class VisInfoApp extends StatelessWidget {
  const VisInfoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ShadApp(
      themeMode: ThemeMode.dark,
      darkTheme: AppTheme.darkTheme,
      builder: (context, child) {
        return MaterialApp.router(
          routerConfig: appRouter,
          theme: Theme.of(context),
          builder: (context, child) {
            return ShadAppBuilder(child: child!);
          },
        );
      },
    );
  }
}
