import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/providers/core_providers.dart';
import '../../core/security/url_allowlist.dart';
import '../../core/widgets/bottom_notification.dart';
import '../../core/widgets/error_view.dart';

class CheckoutWebviewScreen extends ConsumerStatefulWidget {
  final String checkoutUrl;

  const CheckoutWebviewScreen({super.key, required this.checkoutUrl});

  @override
  ConsumerState<CheckoutWebviewScreen> createState() =>
      _CheckoutWebviewScreenState();
}

class _CheckoutWebviewScreenState extends ConsumerState<CheckoutWebviewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _isBlocked = false;

  @override
  void initState() {
    super.initState();
    final config = ref.read(appConfigProvider).valueOrNull;
    final allowlist = UrlAllowlist(
      allowedHosts: config?.webviewAllowedHosts ?? [],
    );

    if (!allowlist.isAllowed(widget.checkoutUrl)) {
      _isBlocked = true;
      return;
    }

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _isLoading = true),
          onPageFinished: (_) => setState(() => _isLoading = false),
          onNavigationRequest: (request) {
            // Strictly check each navigation URL against tenant allowlist
            if (allowlist.isAllowed(request.url)) {
              return NavigationDecision.navigate;
            }
            // Block navigation to untrusted domain
            BottomNotification.show(
              context,
              message: 'Navigation to external domain blocked for security.',
              isError: true,
            );
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  @override
  Widget build(BuildContext context) {
    if (_isBlocked) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout Security')),
        body: const ErrorView(
          title: 'Checkout URL Blocked',
          message:
              'The payment checkout domain is not registered on your store allowlist. Please contact support.',
          icon: Icons.security_rounded,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Checkout'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _controller.reload(),
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
