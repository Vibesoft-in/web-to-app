import 'dart:async';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

/// Result returned from a Razorpay Checkout payment attempt.
class RazorpayPaymentResult {
  final bool success;
  final bool cancelled;
  final String? paymentId;
  final String? orderId;
  final String? signature;
  final String? externalWalletName;
  final String? errorMessage;
  final int? errorCode;

  const RazorpayPaymentResult({
    required this.success,
    this.cancelled = false,
    this.paymentId,
    this.orderId,
    this.signature,
    this.externalWalletName,
    this.errorMessage,
    this.errorCode,
  });

  factory RazorpayPaymentResult.paid({
    required String paymentId,
    String? orderId,
    String? signature,
  }) {
    return RazorpayPaymentResult(
      success: true,
      paymentId: paymentId,
      orderId: orderId,
      signature: signature,
    );
  }

  factory RazorpayPaymentResult.failed({
    required String message,
    int? code,
    bool cancelled = false,
  }) {
    return RazorpayPaymentResult(
      success: false,
      cancelled: cancelled,
      errorMessage: message,
      errorCode: code,
    );
  }

  factory RazorpayPaymentResult.wallet({required String walletName}) {
    return RazorpayPaymentResult(
      success: false,
      externalWalletName: walletName,
      errorMessage: 'Selected external wallet: $walletName',
    );
  }
}

/// Native Razorpay Payment Gateway Service for Flutter Checkout.
///
/// Uses the configured Razorpay API keys (overrideable via `--dart-define`):
/// - `RAZORPAY_TEST_KEY_ID`
/// - `RAZORPAY_TEST_KEY_SECRET`
class RazorpayPaymentService {
  static const String keyId = String.fromEnvironment(
    'RAZORPAY_TEST_KEY_ID',
    defaultValue: 'rzp_test_SnbtbVtFnRIrAI',
  );

  static const String keySecret = String.fromEnvironment(
    'RAZORPAY_TEST_KEY_SECRET',
    defaultValue: 'Y5qIsn5hB5jZ9WJMwptQfVDS',
  );

  static bool get isTestMode => keyId.startsWith('rzp_test_');

  final Dio _dio;
  Razorpay? _razorpay;
  Completer<RazorpayPaymentResult>? _activeCompleter;
  bool _disposed = false;

  RazorpayPaymentService({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: 'https://api.razorpay.com/v1',
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 15),
                headers: {'Content-Type': 'application/json'},
              ),
            );

  void _ensureInitialized() {
    if (_razorpay != null) return;
    _razorpay = Razorpay();
    _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  /// Creates an order via Razorpay Orders API (`POST /v1/orders`).
  ///
  /// Returns the Razorpay `order_id` (e.g. `order_...`), or `null` if the
  /// order API call could not be completed.
  Future<String?> createRazorpayOrder({
    required double amountInRupees,
    required String receipt,
    Map<String, String>? notes,
  }) async {
    final amountInPaise = (amountInRupees * 100).round();
    if (amountInPaise < 100) return null;

    try {
      final basicAuth = 'Basic ${base64Encode(utf8.encode('$keyId:$keySecret'))}';
      final response = await _dio.post<Map<String, dynamic>>(
        '/orders',
        options: Options(
          headers: {
            'Authorization': basicAuth,
            'Content-Type': 'application/json',
          },
        ),
        data: {
          'amount': amountInPaise,
          'currency': 'INR',
          'receipt': receipt.length > 40 ? receipt.substring(0, 40) : receipt,
          'payment_capture': 1,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );

      if ((response.statusCode == 200 || response.statusCode == 201) &&
          response.data != null) {
        final orderId = response.data!['id']?.toString();
        if (orderId != null && orderId.isNotEmpty) {
          return orderId;
        }
      }
    } catch (e) {
      debugPrint('Razorpay createRazorpayOrder error: $e');
    }
    return null;
  }

  /// Verifies the Razorpay HMAC-SHA256 payment signature (`orderId|paymentId`).
  bool verifySignature({
    required String orderId,
    required String paymentId,
    required String signature,
  }) {
    if (orderId.isEmpty || paymentId.isEmpty || signature.isEmpty) {
      return false;
    }
    final hmacSha256 = Hmac(sha256, utf8.encode(keySecret));
    final expected = hmacSha256.convert(utf8.encode('$orderId|$paymentId')).toString();
    return _constantTimeEquals(expected, signature);
  }

  bool _constantTimeEquals(String a, String b) {
    if (a.length != b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
      diff |= a.codeUnitAt(i) ^ b.codeUnitAt(i);
    }
    return diff == 0;
  }

  /// Opens the native Razorpay Checkout sheet and awaits payment completion.
  Future<RazorpayPaymentResult> openCheckout({
    required double amountInRupees,
    required String merchantName,
    required String description,
    String? razorpayOrderId,
    String customerName = '',
    String customerEmail = '',
    String customerPhone = '',
    String themeColorHex = '#E53935',
    Map<String, String>? notes,
  }) async {
    if (_disposed) {
      return RazorpayPaymentResult.failed(
        message: 'Payment session is no longer active.',
      );
    }

    if (kIsWeb) {
      return RazorpayPaymentResult.failed(
        message: 'Razorpay native checkout is supported on Android & iOS devices.',
      );
    }

    final amountInPaise = (amountInRupees * 100).round();
    if (amountInPaise < 100) {
      return RazorpayPaymentResult.failed(
        message: 'Minimum payable amount for Razorpay is ₹1.',
      );
    }

    if (_activeCompleter != null && !_activeCompleter!.isCompleted) {
      return RazorpayPaymentResult.failed(
        message: 'A payment is already in progress.',
      );
    }

    _ensureInitialized();
    final completer = Completer<RazorpayPaymentResult>();
    _activeCompleter = completer;

    final cleanPhone = _sanitizePhone(customerPhone);
    final options = <String, dynamic>{
      'key': keyId,
      'amount': amountInPaise,
      'currency': 'INR',
      'name': merchantName,
      'description': description,
      if (razorpayOrderId != null && razorpayOrderId.isNotEmpty)
        'order_id': razorpayOrderId,
      'retry': {'enabled': true, 'max_count': 2},
      'send_sms_hash': true,
      'prefill': {
        if (cleanPhone.isNotEmpty) 'contact': cleanPhone,
        if (customerEmail.trim().isNotEmpty) 'email': customerEmail.trim(),
        if (customerName.trim().isNotEmpty) 'name': customerName.trim(),
      },
      'theme': {
        'color': themeColorHex,
      },
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };

    try {
      _razorpay!.open(options);
    } catch (e) {
      _activeCompleter = null;
      return RazorpayPaymentResult.failed(
        message: 'Unable to open Razorpay checkout: $e',
      );
    }

    return completer.future;
  }

  String _sanitizePhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 10) return digits;
    if (digits.length > 10) return digits.substring(digits.length - 10);
    return digits;
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) {
    final completer = _activeCompleter;
    _activeCompleter = null;
    if (completer == null || completer.isCompleted) return;

    final paymentId = response.paymentId ?? '';
    final orderId = response.orderId;
    final signature = response.signature;

    if (paymentId.isEmpty) {
      completer.complete(
        RazorpayPaymentResult.failed(
          message: 'Payment succeeded without a payment ID.',
        ),
      );
      return;
    }

    // Verify signature when Razorpay order_id and signature are present
    if (orderId != null &&
        orderId.isNotEmpty &&
        signature != null &&
        signature.isNotEmpty) {
      final isValid = verifySignature(
        orderId: orderId,
        paymentId: paymentId,
        signature: signature,
      );
      if (!isValid) {
        completer.complete(
          RazorpayPaymentResult.failed(
            message: 'Payment signature verification failed. Please contact support.',
          ),
        );
        return;
      }
    }

    completer.complete(
      RazorpayPaymentResult.paid(
        paymentId: paymentId,
        orderId: orderId,
        signature: signature,
      ),
    );
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    final completer = _activeCompleter;
    _activeCompleter = null;
    if (completer == null || completer.isCompleted) return;

    final isCancelled = response.code == Razorpay.PAYMENT_CANCELLED;
    final rawMessage = (response.message ?? '').trim();

    String friendlyMessage;
    if (isCancelled) {
      friendlyMessage = 'Payment was cancelled.';
    } else if (rawMessage.isNotEmpty) {
      // Razorpay Android sometimes wraps error JSON inside message
      friendlyMessage = _extractErrorDescription(rawMessage);
    } else {
      friendlyMessage = 'Payment failed. Please try again.';
    }

    completer.complete(
      RazorpayPaymentResult.failed(
        message: friendlyMessage,
        code: response.code,
        cancelled: isCancelled,
      ),
    );
  }

  String _extractErrorDescription(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        final err = decoded['error'];
        if (err is Map<String, dynamic>) {
          final desc = err['description']?.toString().trim();
          if (desc != null && desc.isNotEmpty) return desc;
        }
        final msg = decoded['message']?.toString().trim();
        if (msg != null && msg.isNotEmpty) return msg;
      }
    } catch (_) {
      // Not JSON — return as-is
    }
    return raw;
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    final completer = _activeCompleter;
    _activeCompleter = null;
    if (completer == null || completer.isCompleted) return;

    completer.complete(
      RazorpayPaymentResult.wallet(
        walletName: response.walletName ?? 'External Wallet',
      ),
    );
  }

  void dispose() {
    _disposed = true;
    if (_activeCompleter != null && !_activeCompleter!.isCompleted) {
      _activeCompleter!.complete(
        RazorpayPaymentResult.failed(
          message: 'Payment cancelled.',
          cancelled: true,
        ),
      );
    }
    _activeCompleter = null;
    _razorpay?.clear();
    _razorpay = null;
  }
}
