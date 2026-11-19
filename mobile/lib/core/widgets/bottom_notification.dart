import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../routing/router.dart';

/// Highly customizable bottom notification with:
/// 1. Slide-up entrance & Text Reveal animation (text is smoothly revealed from left to right)
/// 2. Display hold period
/// 3. Zoom-out and move-down exit animation
class BottomNotification {
  static OverlayEntry? _currentEntry;
  static _BottomNotificationWidgetState? _currentState;

  /// Shows a notification at the bottom of the screen with reveal and zoom-out/move-down exit
  static void show(
    BuildContext context, {
    required String message,
    IconData? icon,
    Color? backgroundColor,
    Color? textColor,
    Color? iconColor,
    String? actionLabel,
    VoidCallback? onAction,
    bool isError = false,
    bool isSuccess = false,
    Duration duration = const Duration(milliseconds: 2800),
    double? bottomOffset,
  }) {
    // Dismiss any existing active notification cleanly
    dismiss();

    try {
      HapticFeedback.lightImpact();
    } catch (_) {}

    OverlayState? overlay;
    try {
      overlay = Overlay.maybeOf(context, rootOverlay: true) ??
          Overlay.maybeOf(context) ??
          rootNavigatorKey.currentState?.overlay;
    } catch (_) {
      overlay = rootNavigatorKey.currentState?.overlay;
    }

    if (overlay == null) return;

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (ctx) {
        return _BottomNotificationWidget(
          key: ValueKey('notification_${DateTime.now().millisecondsSinceEpoch}'),
          message: message,
          icon: icon,
          backgroundColor: backgroundColor,
          textColor: textColor,
          iconColor: iconColor,
          actionLabel: actionLabel,
          onAction: onAction,
          isError: isError,
          isSuccess: isSuccess,
          displayDuration: duration,
          customBottomOffset: bottomOffset,
          onDismissed: () {
            if (_currentEntry == entry) {
              _currentEntry = null;
              _currentState = null;
            }
            if (entry.mounted) {
              entry.remove();
            }
          },
          onReady: (state) {
            _currentState = state;
          },
        );
      },
    );

    _currentEntry = entry;
    overlay.insert(entry);
  }

  /// Manually dismiss current notification with zoom-out and move-down animation
  static void dismiss() {
    if (_currentState != null && _currentState!.mounted) {
      _currentState!.startExitAnimation();
      _currentState = null;
    } else if (_currentEntry != null) {
      if (_currentEntry!.mounted) {
        _currentEntry!.remove();
      }
      _currentEntry = null;
    }
  }
}

class _BottomNotificationWidget extends StatefulWidget {
  final String message;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final Color? iconColor;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool isError;
  final bool isSuccess;
  final Duration displayDuration;
  final double? customBottomOffset;
  final VoidCallback onDismissed;
  final ValueChanged<_BottomNotificationWidgetState> onReady;

  const _BottomNotificationWidget({
    super.key,
    required this.message,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.iconColor,
    this.actionLabel,
    this.onAction,
    this.isError = false,
    this.isSuccess = false,
    required this.displayDuration,
    this.customBottomOffset,
    required this.onDismissed,
    required this.onReady,
  });

  @override
  State<_BottomNotificationWidget> createState() =>
      _BottomNotificationWidgetState();
}

class _BottomNotificationWidgetState extends State<_BottomNotificationWidget>
    with TickerProviderStateMixin {
  // Entrance & Text Reveal Controller
  late final AnimationController _enterController;
  late final Animation<Offset> _slideUpAnim;
  late final Animation<double> _containerFadeAnim;
  late final Animation<double> _textRevealAnim;

  // Exit Controller: Zoom-out & Move-down
  late final AnimationController _exitController;
  late final Animation<double> _zoomOutAnim;
  late final Animation<Offset> _moveDownAnim;
  late final Animation<double> _exitFadeAnim;

  Timer? _dismissTimer;
  bool _isExiting = false;

  @override
  void initState() {
    super.initState();
    widget.onReady(this);

    // 1. Entrance animation (550ms total)
    _enterController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );

    // Container slides up smoothly from below
    _slideUpAnim = Tween<Offset>(
      begin: const Offset(0, 1.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _enterController,
      curve: const Interval(0.0, 0.7, curve: Curves.easeOutBack),
    ));

    // Container opacity
    _containerFadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _enterController,
        curve: const Interval(0.0, 0.35, curve: Curves.easeIn),
      ),
    );

    // Text reveal animation: Text reveals smoothly right after container lands
    _textRevealAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _enterController,
        curve: const Interval(0.25, 1.0, curve: Curves.easeOutCubic),
      ),
    );

    // 2. Exit animation (380ms total): Zoom out and move down
    _exitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );

    // Zoom out (scale down from 1.0 to 0.6)
    _zoomOutAnim = Tween<double>(begin: 1.0, end: 0.6).animate(
      CurvedAnimation(
        parent: _exitController,
        curve: const Interval(0.0, 0.9, curve: Curves.easeInOutCubic),
      ),
    );

    // Move down (slide off bottom)
    _moveDownAnim = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(0, 2.0),
    ).animate(
      CurvedAnimation(
        parent: _exitController,
        curve: const Interval(0.05, 1.0, curve: Curves.easeInOutCubic),
      ),
    );

    // Fade out as it zooms out and drops
    _exitFadeAnim = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _exitController,
        curve: const Interval(0.2, 1.0, curve: Curves.easeOut),
      ),
    );

    // Start entrance
    _enterController.forward().then((_) {
      if (!mounted || _isExiting) return;
      // Schedule zoom out and move down after specified duration
      _dismissTimer = Timer(widget.displayDuration, () {
        startExitAnimation();
      });
    });
  }

  void startExitAnimation() {
    if (!mounted || _isExiting) return;
    _isExiting = true;
    _dismissTimer?.cancel();
    _exitController.forward().then((_) {
      if (mounted) {
        widget.onDismissed();
      }
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _enterController.dispose();
    _exitController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final bottomInset = media.viewInsets.bottom;
    final bottomPadding = media.padding.bottom;

    // Smart bottom offset:
    // If keyboard is open, stay above keyboard
    // If custom offset is passed, use that
    // Otherwise position nicely above system bar or bottom tabs
    final effectiveBottom = widget.customBottomOffset ??
        (bottomInset > 0
            ? bottomInset + 16.0
            : (bottomPadding > 0 ? bottomPadding + 64.0 : 76.0));

    // Theme & colors
    final isErr = widget.isError;
    final isSucc = widget.isSuccess;

    Color bgStart = const Color(0xFF111111); // Sleek Black
    Color bgEnd = const Color(0xFF1F2937);
    Color accentColor = const Color(0xFFE53935); // Red
    IconData defaultIcon = Icons.info_outline_rounded;

    if (isErr) {
      bgStart = const Color(0xFF991B1B);
      bgEnd = const Color(0xFFDC2626);
      accentColor = const Color(0xFFFCA5A5);
      defaultIcon = Icons.error_outline_rounded;
    } else if (isSucc) {
      bgStart = const Color(0xFF065F46);
      bgEnd = const Color(0xFF059669);
      accentColor = const Color(0xFF6EE7B7);
      defaultIcon = Icons.check_circle_rounded;
    } else if (widget.backgroundColor != null) {
      bgStart = widget.backgroundColor!;
      bgEnd = widget.backgroundColor!.withOpacity(0.9);
      accentColor = Colors.white;
    }

    final displayIcon = widget.icon ?? defaultIcon;
    final textCol = widget.textColor ?? Colors.white;

    return Positioned(
      bottom: effectiveBottom,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _slideUpAnim,
        child: FadeTransition(
          opacity: _containerFadeAnim,
          child: SlideTransition(
            position: _moveDownAnim,
            child: ScaleTransition(
              scale: _zoomOutAnim,
              child: FadeTransition(
                opacity: _exitFadeAnim,
                child: Material(
                  color: Colors.transparent,
                  child: GestureDetector(
                    onVerticalDragEnd: (details) {
                      // Swipe down to dismiss
                      if ((details.primaryVelocity ?? 0) > 100) {
                        startExitAnimation();
                      }
                    },
                    onTap: () {
                      // Tap to dismiss
                      startExitAnimation();
                    },
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 48),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [bgStart, bgEnd],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.18),
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: bgStart.withOpacity(0.4),
                            blurRadius: 18,
                            spreadRadius: 1,
                            offset: const Offset(0, 8),
                          ),
                          BoxShadow(
                            color: Colors.black.withOpacity(0.15),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          // Animated Icon Container
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.18),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              displayIcon,
                              color: widget.iconColor ?? accentColor,
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Text with smooth Reveal Animation
                          Expanded(
                            child: AnimatedBuilder(
                              animation: _textRevealAnim,
                              builder: (context, child) {
                                return ClipRect(
                                  child: Align(
                                    alignment: Alignment.centerLeft,
                                    widthFactor: _textRevealAnim.value
                                        .clamp(0.0, 1.0),
                                    child: Text(
                                      widget.message,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: textCol,
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 0.1,
                                        height: 1.25,
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),

                          // Optional Action Button (e.g., VIEW CART)
                          if (widget.actionLabel != null) ...[
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () {
                                widget.onAction?.call();
                                startExitAnimation();
                              },
                              borderRadius: BorderRadius.circular(14),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Text(
                                  widget.actionLabel!,
                                  style: TextStyle(
                                    color: bgStart,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
