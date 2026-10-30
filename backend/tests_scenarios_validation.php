<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Enums\AppStatus;
use App\Enums\Platform;
use App\Enums\SetupStep;
use App\Models\App;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

echo "=======================================================\n";
echo "RUNNING FULL USER FLOW & SCENARIO VERIFICATION TEST SUITE\n";
echo "=======================================================\n\n";

$passCount = 0;
$failCount = 0;

function assertCondition(bool $cond, string $name, string $details = '')
{
    global $passCount, $failCount;
    if ($cond) {
        $passCount++;
        echo " [PASS] {$name}\n";
    } else {
        $failCount++;
        echo " [FAIL] {$name} - Details: {$details}\n";
    }
}

function handleRequest(Illuminate\Http\Request $req)
{
    auth()->forgetGuards();
    return app()->handle($req);
}

// -------------------------------------------------------------
// Scenario A: First-time user
// -------------------------------------------------------------
echo "\n--- SCENARIO A: First-time User Registration & App Completion ---\n";

// Clean up any stale test apps
App::withoutGlobalScopes()->where('name', 'like', '%Test%')->orWhere('name', 'like', '%Mobile%')->orWhere('name', 'like', '%Midway%')->orWhere('name', 'like', '%Second Store%')->delete();

$emailA = "test_first_time_" . Str::lower(Str::random(6)) . "@example.com";
$tenantA = Tenant::create(['ulid' => Str::ulid(), 'name' => 'First Time Store', 'status' => 'trial']);
$userA = User::create([
    'tenant_id'         => $tenantA->id,
    'name'              => 'First Time User',
    'email'             => $emailA,
    'password'          => Hash::make('Secret123456!'),
    'role'              => 'owner',
    'email_verified_at' => now(),
]);
$tenantA->update(['owner_user_id' => $userA->id]);

// A1: User starts with NO apps and NO built apps
$userA->refresh();
assertCondition(!$userA->has_apps, "A1.1: Newly registered user has has_apps = false");
assertCondition(!$userA->has_built_apps, "A1.2: Newly registered user has has_built_apps = false");
assertCondition($userA->latest_draft === null, "A1.3: Newly registered user has latest_draft = null");

// A2: Verify dashboard access check is blocked
$tokenA = $userA->createToken('dashboard', ['*'], now()->addDays(7));
$responseA = handleRequest(
    Illuminate\Http\Request::create('/api/dashboard/access-check', 'GET', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $tokenA->plainTextToken,
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
assertCondition(
    $responseA->getStatusCode() === 403,
    "A2: Dashboard access is rejected (403 Forbidden) for newly registered user without built apps",
    "Status: " . $responseA->getStatusCode() . " Body: " . $responseA->getContent()
);

// A3: User creates a draft app
$appA = App::create([
    'tenant_id'    => $tenantA->id,
    'name'         => 'First Mobile App',
    'platform'     => Platform::WooCommerce,
    'package_name' => 'com.firststore.' . Str::lower(Str::random(8)),
    'app_key'      => 'app_key_' . Str::random(32),
    'setup_step'   => SetupStep::Platform,
    'status'       => AppStatus::Draft,
]);
$userA->refresh();
assertCondition($userA->has_apps, "A3.1: User now has an app");
assertCondition(!$userA->has_built_apps, "A3.2: User still does NOT have built apps (it is a draft)");
assertCondition($userA->latest_draft !== null && $userA->latest_draft['ulid'] === $appA->ulid, "A3.3: latest_draft points to First Mobile App");

// A4: Complete the app via /api/apps/{ulid}/complete
$completeResponse = handleRequest(
    Illuminate\Http\Request::create("/api/apps/{$appA->ulid}/complete", 'POST', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $tokenA->plainTextToken,
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
assertCondition(
    $completeResponse->getStatusCode() === 200,
    "A4: App completion endpoint succeeds with 200 OK",
    $completeResponse->getContent()
);

$appA->refresh();
$userA->refresh();
assertCondition($appA->status === AppStatus::Completed, "A4.1: App status is now 'completed'");
assertCondition($userA->has_built_apps, "A4.2: User has_built_apps is now true");

// A5: Dashboard access is now allowed!
$responseA2 = handleRequest(
    Illuminate\Http\Request::create('/api/dashboard/access-check', 'GET', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $tokenA->plainTextToken,
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
assertCondition(
    $responseA2->getStatusCode() === 200,
    "A5: Dashboard access is now granted (200 OK) after app completion",
    $responseA2->getContent()
);

// -------------------------------------------------------------
// Scenario B: User leaves midway
// -------------------------------------------------------------
echo "\n--- SCENARIO B: User Leaves Midway & Resumes Exact Step ---\n";

$emailB = "test_midway_" . Str::lower(Str::random(6)) . "@example.com";
$tenantB = Tenant::create(['ulid' => Str::ulid(), 'name' => 'Midway Store', 'status' => 'trial']);
$userB = User::create([
    'tenant_id'         => $tenantB->id,
    'name'              => 'Midway User',
    'email'             => $emailB,
    'password'          => Hash::make('Secret123456!'),
    'role'              => 'owner',
    'email_verified_at' => now(),
]);
$tenantB->update(['owner_user_id' => $userB->id]);
$tokenB = $userB->createToken('dashboard', ['*'], now()->addDays(7));

// Create app and advance to step: 'theme'
$appB = App::create([
    'tenant_id'    => $tenantB->id,
    'name'         => 'Midway Shop App',
    'platform'     => Platform::WooCommerce,
    'package_name' => 'com.midwayshop.' . Str::lower(Str::random(8)),
    'app_key'      => 'app_key_' . Str::random(32),
    'setup_step'   => SetupStep::Theme,
    'status'       => AppStatus::Draft,
]);

// B1: Verify that user session is valid and returns exact draft state
$responseBMe = handleRequest(
    Illuminate\Http\Request::create('/api/user', 'GET', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $tokenB->plainTextToken,
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
$bodyB = json_decode($responseBMe->getContent(), true);
assertCondition(
    $responseBMe->getStatusCode() === 200,
    "B1: User profile / session is valid",
    $responseBMe->getContent()
);
assertCondition(
    $bodyB['has_built_apps'] === false,
    "B2: has_built_apps remains false while draft is in progress"
);
assertCondition(
    isset($bodyB['latest_draft']) && $bodyB['latest_draft']['setup_step'] === 'theme',
    "B3: latest_draft accurately points to step 'theme' for seamless resume",
    json_encode($bodyB['latest_draft'] ?? [])
);

// B2: Dashboard access directly is blocked
$responseBDash = handleRequest(
    Illuminate\Http\Request::create('/api/dashboard/access-check', 'GET', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $tokenB->plainTextToken,
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
assertCondition(
    $responseBDash->getStatusCode() === 403,
    "B4: Direct dashboard URL access is rejected with 403 for midway draft user"
);

// -------------------------------------------------------------
// Scenario C: Returning user with completed app
// -------------------------------------------------------------
echo "\n--- SCENARIO C: Returning User with Valid Session & Completed App ---\n";

// C1: Re-authenticate userA (who has completed appA)
$responseLogin = handleRequest(
    Illuminate\Http\Request::create('/api/auth/login', 'POST', [
        'email'    => $emailA,
        'password' => 'Secret123456!',
    ], [], [], ['HTTP_ACCEPT' => 'application/json'])
);
$bodyLogin = json_decode($responseLogin->getContent(), true);
assertCondition(
    $responseLogin->getStatusCode() === 200,
    "C1: Returning user logs in successfully"
);
assertCondition(
    $bodyLogin['user']['has_built_apps'] === true,
    "C2: Login response indicates has_built_apps = true for returning user"
);

// -------------------------------------------------------------
// Scenario D: 7-Day Session Expiry
// -------------------------------------------------------------
echo "\n--- SCENARIO D: 7-Day Session Expiry ---\n";

// Create a token issued 8 days ago (expired per 7-day policy)
$tokenD = $userA->createToken('dashboard', ['*'], now()->subDays(8));
// Force created_at to 8 days ago in DB
PersonalAccessToken::find($tokenD->accessToken->id)->update([
    'created_at' => now()->subDays(8),
    'expires_at' => now()->subDays(1),
]);

$responseExpired = handleRequest(
    Illuminate\Http\Request::create('/api/user', 'GET', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $tokenD->plainTextToken,
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
assertCondition(
    $responseExpired->getStatusCode() === 401,
    "D1: Token older than 7 days is rejected with 401 Unauthenticated",
    "Status: " . $responseExpired->getStatusCode()
);

// -------------------------------------------------------------
// Scenario E: Multiple projects (1 completed, 1 draft)
// -------------------------------------------------------------
echo "\n--- SCENARIO E: Multiple Projects (Completed + Incomplete Draft) ---\n";

// User A starts a SECOND app
$appA2 = App::create([
    'tenant_id'    => $tenantA->id,
    'name'         => 'Second Store App',
    'platform'     => Platform::Shopify,
    'package_name' => 'com.secondstore.' . Str::lower(Str::random(8)),
    'app_key'      => 'app_key_' . Str::random(32),
    'setup_step'   => SetupStep::Connect,
    'status'       => AppStatus::Draft,
]);

$userA->refresh();
assertCondition(
    $userA->has_built_apps === true,
    "E1: User still has has_built_apps = true because of completed App 1"
);
assertCondition(
    $userA->latest_draft !== null && $userA->latest_draft['ulid'] === $appA2->ulid,
    "E2: latest_draft points to the new in-progress draft (App 2 at step connect)"
);

// Dashboard access remains accessible because they have completed app 1
$responseEAccess = handleRequest(
    Illuminate\Http\Request::create('/api/dashboard/access-check', 'GET', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $bodyLogin['token'],
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
assertCondition(
    $responseEAccess->getStatusCode() === 200,
    "E3: Dashboard access remains granted for user with multiple projects"
);

// -------------------------------------------------------------
// Scenario F: Direct URL access checks
// -------------------------------------------------------------
echo "\n--- SCENARIO F: Direct URL Access Guard ---\n";

// F1: Unauthenticated request
$responseUnauth = handleRequest(
    Illuminate\Http\Request::create('/api/dashboard/access-check', 'GET', [], [], [], [
        'HTTP_ACCEPT' => 'application/json',
    ])
);
assertCondition(
    $responseUnauth->getStatusCode() === 401,
    "F1: Unauthenticated access to dashboard returns 401"
);

// F2: Authenticated user with no completed apps
$responseF2 = handleRequest(
    Illuminate\Http\Request::create('/api/dashboard/access-check', 'GET', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer ' . $tokenB->plainTextToken,
        'HTTP_ACCEPT'        => 'application/json',
    ])
);
assertCondition(
    $responseF2->getStatusCode() === 403,
    "F2: Authenticated user with NO completed apps returns 403"
);

// Clean up test data
$appA->delete();
$appA2->delete();
$appB->delete();
$userA->tokens()->delete();
$userA->delete();
$tenantA->delete();
$userB->tokens()->delete();
$userB->delete();
$tenantB->delete();

echo "\n=======================================================\n";
echo "SCENARIOS TEST SUMMARY: {$passCount} PASSED, {$failCount} FAILED\n";
echo "=======================================================\n";
