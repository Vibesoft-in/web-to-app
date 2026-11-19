import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webintoapp_mobile/core/services/razorpay_service.dart';

void main() {
  group('RazorpayPaymentService Unit Tests', () {
    test('uses configured Razorpay test keys by default', () {
      expect(RazorpayPaymentService.keyId, 'rzp_test_SnbtbVtFnRIrAI');
      expect(RazorpayPaymentService.keySecret, 'Y5qIsn5hB5jZ9WJMwptQfVDS');
      expect(RazorpayPaymentService.isTestMode, isTrue);
    });

    test('verifies valid HMAC-SHA256 Razorpay payment signature', () {
      final service = RazorpayPaymentService();
      const orderId = 'order_Test123456';
      const paymentId = 'pay_Test987654';
      final expectedSig = Hmac(
        sha256,
        utf8.encode(RazorpayPaymentService.keySecret),
      ).convert(utf8.encode('$orderId|$paymentId')).toString();

      expect(
        service.verifySignature(
          orderId: orderId,
          paymentId: paymentId,
          signature: expectedSig,
        ),
        isTrue,
      );
      service.dispose();
    });

    test('rejects tampered or empty Razorpay payment signature', () {
      final service = RazorpayPaymentService();
      expect(
        service.verifySignature(
          orderId: 'order_Test123456',
          paymentId: 'pay_Test987654',
          signature: 'invalid_signature_value',
        ),
        isFalse,
      );
      expect(
        service.verifySignature(
          orderId: '',
          paymentId: 'pay_Test987654',
          signature: 'abc',
        ),
        isFalse,
      );
      service.dispose();
    });
  });
}
