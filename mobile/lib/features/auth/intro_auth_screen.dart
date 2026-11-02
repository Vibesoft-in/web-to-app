import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';

class IntroAuthScreen extends ConsumerStatefulWidget {
  const IntroAuthScreen({super.key});

  @override
  ConsumerState<IntroAuthScreen> createState() => _IntroAuthScreenState();
}

class _IntroAuthScreenState extends ConsumerState<IntroAuthScreen> {
  bool _isSignUp = false;
  bool _obscurePassword = true;
  String _selectedGender = 'Female';
  String? _errorMessage;
  bool _isNewUserNotice = false;
  bool _isLoading = false;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _ageController = TextEditingController();
  DateTime? _selectedDob;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final initialDate = _selectedDob ?? DateTime(now.year - 20, 1, 1);

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1920),
      lastDate: now,
      helpText: 'SELECT DATE OF BIRTH',
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF704FEE),
              onPrimary: Colors.white,
              onSurface: Color(0xFF1E1B4B),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDob = picked;
        final months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        _dobController.text =
            '${picked.day.toString().padLeft(2, '0')} ${months[picked.month - 1]} ${picked.year}';

        // Automatically calculate age from selected Date of Birth
        int calculatedAge = now.year - picked.year;
        if (now.month < picked.month ||
            (now.month == picked.month && now.day < picked.day)) {
          calculatedAge--;
        }
        if (calculatedAge < 0) calculatedAge = 0;
        _ageController.text = '$calculatedAge';
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_isLoading) return;
    setState(() {
      _errorMessage = null;
      _isNewUserNotice = false;
    });

    if (_isSignUp) {
      final name = _nameController.text.trim();
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();
      final phone = _phoneController.text.trim();
      final dob = _dobController.text.trim();
      final age = _ageController.text.trim();

      if (name.isEmpty) {
        setState(() => _errorMessage = 'Please enter your full name.');
        return;
      }
      if (email.isEmpty || !email.contains('@')) {
        setState(() => _errorMessage = 'Please enter a valid email address.');
        return;
      }
      if (password.length < 4) {
        setState(() => _errorMessage = 'Password must be at least 4 characters long.');
        return;
      }

      setState(() => _isLoading = true);

      final error = await ref.read(userProfileProvider.notifier).register(
        name: name,
        email: email,
        password: password,
        phone: phone,
        dob: dob,
        age: age,
        gender: _selectedGender,
      );

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (error != null) {
        setState(() {
          _errorMessage = error;
          if (error.contains('already registered')) {
            _isSignUp = false; // Switch to Sign In if already registered
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(error)),
              ],
            ),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }

      final current = ref.read(userProfileProvider);
      
      // Ensure newly created user starts with an empty cart and empty wishlist
      ref.read(cartItemsProvider.notifier).clearCart();
      ref.read(wishlistProvider.notifier).clear();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Account created! Welcome, ${current.name}! 🎉'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF059669),
          duration: const Duration(seconds: 2),
        ),
      );
      context.go('/home');
    } else {
      // Sign In validation
      final input = _emailController.text.trim();
      final password = _passwordController.text.trim();

      if (input.isEmpty && password.isEmpty) {
        setState(() => _errorMessage = 'Please enter your registered email and password.');
        return;
      }
      if (input.isEmpty) {
        setState(() => _errorMessage = 'Please enter your registered email or phone.');
        return;
      }
      if (password.isEmpty) {
        setState(() => _errorMessage = 'Please enter your password.');
        return;
      }

      setState(() => _isLoading = true);

      final result = await ref.read(userProfileProvider.notifier).login(
        emailOrPhone: input,
        password: password,
      );

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (!result.success) {
        final errorMsg = result.isNewUser
            ? (result.message ?? 'Wrong credentials! Account not found in our store database. Please sign up.')
            : (result.message ?? 'Wrong credentials! Incorrect email or password. Please try again.');

        setState(() {
          _isNewUserNotice = false;
          _errorMessage = errorMsg;
        });

        // Show prominent notification alerting wrong credentials with quick Sign Up action
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white, size: 24),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Wrong credentials!',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        result.isNewUser
                            ? 'Account not found. Please sign up to create a new account.'
                            : 'Incorrect email or password. Please sign up if you don\'t have an account.',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 6),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            action: SnackBarAction(
              label: 'SIGN UP',
              textColor: const Color(0xFFFDE047),
              onPressed: () {
                setState(() {
                  _isSignUp = true;
                  _errorMessage = null;
                });
              },
            ),
          ),
        );
        return; // Stays on page and lets user review or tap Sign Up
      }

      // Valid registered credentials from website!
      final current = ref.read(userProfileProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Welcome back, ${current.name}! 👋'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF059669),
          duration: const Duration(seconds: 2),
        ),
      );
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: darkTextColor),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home');
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => context.go('/home'),
            child: const Text(
              'Skip',
              style: TextStyle(
                color: Color(0xFF704FEE),
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero Banner with Official Website Brand Logo
              Center(
                child: Container(
                  width: 90,
                  height: 90,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: primaryColor.withOpacity(0.18),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: CachedNetworkImage(
                    imageUrl: WooCommerceService.siteLogoUrl,
                    fit: BoxFit.contain,
                    placeholder: (context, url) => const Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF704FEE),
                        ),
                      ),
                    ),
                    errorWidget: (context, url, error) => Image.network(
                      WooCommerceService.siteIconUrl,
                      fit: BoxFit.contain,
                      errorBuilder: (context, err, stack) => const Icon(
                        Icons.bolt_rounded,
                        size: 42,
                        color: Color(0xFF704FEE),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title & Subtitle
              Text(
                _isSignUp ? 'Create Your Account' : 'Welcome to Store 👋',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: darkTextColor,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _isSignUp
                  ? 'Join millions of shoppers discovering premium collections'
                  : 'Discover latest trends, exclusive offers & fast delivery',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 28),

              // Toggle Tab (Sign In / Sign Up)
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _isSignUp = false;
                          _errorMessage = null;
                        }),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: !_isSignUp ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: !_isSignUp
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.06),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                          ),
                          child: Text(
                            'Sign In',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: !_isSignUp ? primaryColor : Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _isSignUp = true;
                          _errorMessage = null;
                        }),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _isSignUp ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: _isSignUp
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.06),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                          ),
                          child: Text(
                            'Sign Up',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: _isSignUp ? primaryColor : Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Error / Notice Banner (Promptly displays when new user or wrong credentials)
              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: _isNewUserNotice
                        ? const Color(0xFFF5F3FF)
                        : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _isNewUserNotice
                          ? const Color(0xFFC4B5FD)
                          : const Color(0xFFFCA5A5),
                      width: 1.2,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        _isNewUserNotice
                            ? Icons.person_add_alt_1_rounded
                            : Icons.error_outline_rounded,
                        color: _isNewUserNotice
                            ? const Color(0xFF704FEE)
                            : const Color(0xFFDC2626),
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isNewUserNotice
                                  ? 'New Customer? Welcome!'
                                  : 'Wrong Credentials',
                              style: TextStyle(
                                color: _isNewUserNotice
                                    ? const Color(0xFF5B21B6)
                                    : const Color(0xFF991B1B),
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _errorMessage!,
                              style: TextStyle(
                                color: _isNewUserNotice
                                    ? const Color(0xFF6D28D9)
                                    : const Color(0xFFB91C1C),
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (!_isSignUp) ...[
                              const SizedBox(height: 10),
                              InkWell(
                                onTap: () {
                                  setState(() {
                                    _isSignUp = true;
                                    _errorMessage = null;
                                  });
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF704FEE),
                                    borderRadius: BorderRadius.circular(8),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF704FEE).withOpacity(0.3),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.person_add_alt_1_rounded, size: 14, color: Colors.white),
                                      SizedBox(width: 6),
                                      Text(
                                        'New user? Sign Up here',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      SizedBox(width: 4),
                                      Icon(Icons.arrow_forward_rounded, size: 12, color: Colors.white),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() {
                          _errorMessage = null;
                          _isNewUserNotice = false;
                        }),
                        child: Icon(
                          Icons.close_rounded,
                          size: 16,
                          color: _isNewUserNotice
                              ? const Color(0xFF7C3AED)
                              : const Color(0xFFB91C1C),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Form Fields
              if (_isSignUp) ...[
                _buildInputLabel('Full Name'),
                TextField(
                  controller: _nameController,
                  decoration: _buildInputDecoration(
                    hint: 'e.g. Megha Bahukhandi',
                    icon: Icons.person_outline_rounded,
                  ),
                ),
                const SizedBox(height: 16),

                _buildInputLabel('Email Address'),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: _buildInputDecoration(
                    hint: 'e.g. name@domain.com',
                    icon: Icons.email_outlined,
                  ),
                ),
                const SizedBox(height: 16),

                _buildInputLabel('Phone Number'),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: _buildInputDecoration(
                    hint: '+91 98765 43210',
                    icon: Icons.phone_outlined,
                  ),
                ),
                const SizedBox(height: 16),

                // Date of Birth (DOB) Field with Calendar Picker
                _buildInputLabel('Date of Birth (DOB)'),
                TextField(
                  controller: _dobController,
                  readOnly: true,
                  onTap: _pickDob,
                  decoration: _buildInputDecoration(
                    hint: 'Select your date of birth',
                    icon: Icons.calendar_month_rounded,
                    suffixIcon: IconButton(
                      icon: const Icon(
                        Icons.calendar_today_rounded,
                        color: primaryColor,
                        size: 20,
                      ),
                      onPressed: _pickDob,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Dedicated Age Field (Auto-calculated from DOB)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildInputLabel('Age'),
                    if (_dobController.text.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF704FEE).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          '⚡ Auto-calculated',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF704FEE),
                          ),
                        ),
                      ),
                  ],
                ),
                TextField(
                  controller: _ageController,
                  keyboardType: TextInputType.number,
                  decoration: _buildInputDecoration(
                    hint: _dobController.text.isEmpty
                        ? 'Select DOB above or enter age'
                        : 'Auto-filled from DOB',
                    icon: Icons.cake_outlined,
                  ),
                ),
                const SizedBox(height: 16),

                // Dedicated Gender Field with Interactive Cards
                _buildInputLabel('Gender'),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      {'label': 'Female', 'icon': '👩'},
                      {'label': 'Male', 'icon': '👨'},
                      {'label': 'Other', 'icon': '🧑'},
                    ].map((item) {
                      final label = item['label'] as String;
                      final emoji = item['icon'] as String;
                      final isSelected = _selectedGender == label;

                      return Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedGender = label),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected ? primaryColor : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: primaryColor.withOpacity(0.3),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(emoji, style: const TextStyle(fontSize: 14)),
                                const SizedBox(width: 6),
                                Text(
                                  label,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                    color: isSelected ? Colors.white : const Color(0xFF4B5563),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),
              ] else ...[
                _buildInputLabel('Email / Phone Number'),
                TextField(
                  controller: _emailController,
                  onChanged: (_) {
                    if (_errorMessage != null) setState(() => _errorMessage = null);
                  },
                  decoration: _buildInputDecoration(
                    hint: 'Enter your email or phone',
                    icon: Icons.email_outlined,
                  ),
                ),
                const SizedBox(height: 16),
              ],

              _buildInputLabel('Password'),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                onChanged: (_) {
                  if (_errorMessage != null) setState(() => _errorMessage = null);
                },
                onSubmitted: (_) => _handleSubmit(),
                decoration: _buildInputDecoration(
                  hint: 'Enter password',
                  icon: Icons.lock_outline_rounded,
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: Colors.grey.shade500,
                      size: 20,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),

              if (!_isSignUp) ...[
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      final email = _emailController.text.trim();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            email.isNotEmpty
                                ? 'Password reset instructions have been sent to $email.'
                                : 'Please enter your registered email to reset your password.',
                          ),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: primaryColor,
                          duration: const Duration(seconds: 3),
                        ),
                      );
                    },
                    style: TextButton.styleFrom(padding: EdgeInsets.zero),
                    child: const Text(
                      'Forgot password?',
                      style: TextStyle(
                        fontSize: 13,
                        color: primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),

              // Primary Action Button
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: primaryColor.withOpacity(0.6),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        _isSignUp ? 'Create Account' : 'Sign In',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
              const SizedBox(height: 20),

              // Divider
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey.shade200)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Text(
                      'Or continue with',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.grey.shade200)),
                ],
              ),
              const SizedBox(height: 20),

              // Social login buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please sign in with your store email and password.'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                      icon: const Icon(Icons.g_mobiledata_rounded, size: 28, color: Colors.redAccent),
                      label: const Text('Google', style: TextStyle(color: darkTextColor, fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: BorderSide(color: Colors.grey.shade200),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please sign in with your store email and password.'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                      icon: const Icon(Icons.apple_rounded, size: 22, color: darkTextColor),
                      label: const Text('Apple', style: TextStyle(color: darkTextColor, fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: BorderSide(color: Colors.grey.shade200),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Color(0xFF374151),
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration({
    required String hint,
    required IconData icon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
      prefixIcon: Icon(icon, color: Colors.grey.shade500, size: 20),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF704FEE), width: 1.5),
      ),
    );
  }
}
