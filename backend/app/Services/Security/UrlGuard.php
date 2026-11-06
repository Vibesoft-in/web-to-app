<?php

declare(strict_types=1);

namespace App\Services\Security;

use App\Services\Security\Exceptions\UrlGuardException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class UrlGuard
{
    public const DEFAULT_TIMEOUT_SECONDS = 10;
    public const DEFAULT_MAX_REDIRECTS = 3;
    public const DEFAULT_MAX_SIZE_BYTES = 5242880; // 5 MB

    /**
     * Optional custom DNS resolver for testing and DNS rebinding simulation.
     * Callable signature: fn(string $host): array<string>
     *
     * @var (callable(string): array<string>)|null
     */
    private static $dnsResolver = null;

    /**
     * CIDR blocks that must never be accessed (SSRF protection).
     *
     * @var array<string>
     */
    private const FORBIDDEN_CIDRS = [
        // IPv4 Loopback & Local
        '0.0.0.0/8',
        '127.0.0.0/8',
        // IPv4 Private networks
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        // IPv4 Link-local & Cloud Metadata (169.254.169.254)
        '169.254.0.0/16',
        // Shared Address Space (Carrier Grade NAT)
        '100.64.0.0/10',
        // Documentation & Testing
        '192.0.0.0/24',
        '192.0.2.0/24',
        '198.51.100.0/24',
        '203.0.113.0/24',
        // Multicast & Reserved
        '224.0.0.0/4',
        '240.0.0.0/4',
        '255.255.255.255/32',
    ];

    /**
     * Override DNS resolver (used for unit tests and DNS rebinding tests).
     *
     * @param (callable(string): array<string>)|null $resolver
     */
    public static function setDnsResolver(?callable $resolver): void
    {
        self::$dnsResolver = $resolver;
    }

    /**
     * Reset DNS resolver back to default system resolver.
     */
    public static function resetDnsResolver(): void
    {
        self::$dnsResolver = null;
    }

    /**
     * Validates a URL against all SSRF safety rules.
     * Returns the normalized URL if valid, or throws UrlGuardException.
     *
     * @throws UrlGuardException
     */
    public function validateUrl(string $url): string
    {
        $parts = parse_url(trim($url));

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            throw new UrlGuardException("Malformed or invalid URL: {$url}", 'URL_UNREACHABLE');
        }

        // 1. HTTPS only
        $scheme = strtolower($parts['scheme']);
        if ($scheme !== 'https') {
            throw UrlGuardException::notHttps($url);
        }

        // 2. Only standard port 443 is permitted (or omitted which defaults to 443)
        $port = $parts['port'] ?? 443;
        if ($port !== 443) {
            throw UrlGuardException::invalidPort($port);
        }

        $host = strtolower($parts['host']);

        // 3. Block literal loopback / private names
        if ($this->isForbiddenHostname($host)) {
            throw UrlGuardException::blockedIp($host, 'Forbidden local/private hostname');
        }

        // 4. Resolve host to IP addresses and validate every IP
        $ips = $this->resolveHost($host);
        if (empty($ips)) {
            throw UrlGuardException::resolutionFailed($host);
        }

        foreach ($ips as $ip) {
            $this->validateIp($ip);
        }

        return $url;
    }

    /**
     * Executes a safe GET request enforcing HTTPS, IP filtering, redirect hop validation,
     * timeout, and response size limits.
     *
     * @param array<string, mixed> $options
     * @throws UrlGuardException
     */
    public function get(string $url, array $options = []): Response
    {
        return $this->request('GET', $url, $options);
    }

    /**
     * Executes a safe HTTP request with hop-by-hop redirect re-validation.
     *
     * @param array<string, mixed> $options
     * @throws UrlGuardException
     */
    public function request(string $method, string $url, array $options = []): Response
    {
        $timeout = (int) ($options['timeout'] ?? self::DEFAULT_TIMEOUT_SECONDS);
        $maxRedirects = (int) ($options['max_redirects'] ?? self::DEFAULT_MAX_REDIRECTS);
        $maxSizeBytes = (int) ($options['max_size'] ?? self::DEFAULT_MAX_SIZE_BYTES);

        $currentUrl = $this->validateUrl($url);
        $redirectCount = 0;

        while (true) {
            try {
                $clientOptions = [];
                if (isset($options['verify'])) {
                    $clientOptions['verify'] = $options['verify'];
                } elseif (file_exists(base_path('cacert.pem'))) {
                    $clientOptions['verify'] = base_path('cacert.pem');
                }

                /** @var \Illuminate\Http\Client\PendingRequest $client */
                $client = Http::timeout($timeout)
                    ->withoutRedirecting()
                    ->withHeaders($options['headers'] ?? []);

                if (! empty($clientOptions)) {
                    $client = $client->withOptions($clientOptions);
                }

                if (isset($options['auth']) && is_array($options['auth'])) {
                    $client = $client->withBasicAuth($options['auth'][0], $options['auth'][1]);
                }

                $response = match (strtoupper($method)) {
                    'GET'    => $client->get($currentUrl, $options['query'] ?? []),
                    'POST'   => $client->post($currentUrl, $options['json'] ?? $options['data'] ?? []),
                    'PUT'    => $client->put($currentUrl, $options['json'] ?? $options['data'] ?? []),
                    'DELETE' => $client->delete($currentUrl, $options['json'] ?? $options['data'] ?? []),
                    default  => $client->send($method, $currentUrl, $options),
                };
            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                throw new UrlGuardException("Connection error or timeout reaching {$currentUrl}: " . $e->getMessage(), 'URL_UNREACHABLE');
            } catch (\Throwable $e) {
                if ($e instanceof UrlGuardException) {
                    throw $e;
                }
                throw new UrlGuardException("Failed to request {$currentUrl}: " . $e->getMessage(), 'URL_UNREACHABLE');
            }

            // Check if response is a redirect (301, 302, 303, 307, 308)
            if ($response->redirect()) {
                $redirectCount++;
                if ($redirectCount > $maxRedirects) {
                    throw UrlGuardException::redirectLimitExceeded($maxRedirects);
                }

                $location = $response->header('Location');
                if (empty($location)) {
                    throw new UrlGuardException("Redirect received with empty Location header.", 'REST_BLOCKED');
                }

                // Resolve relative redirect if needed
                $targetUrl = $this->resolveRedirectUrl($currentUrl, $location);

                // RE-VALIDATE every redirect hop (blocks redirects to 127.0.0.1 or internal IPs)
                $currentUrl = $this->validateUrl($targetUrl);
                continue;
            }

            // Enforce response size cap
            $contentLength = $response->header('Content-Length');
            if ($contentLength !== null && (int) $contentLength > $maxSizeBytes) {
                throw UrlGuardException::responseSizeExceeded($maxSizeBytes);
            }

            $bodyLength = strlen($response->body());
            if ($bodyLength > $maxSizeBytes) {
                throw UrlGuardException::responseSizeExceeded($maxSizeBytes);
            }

            return $response;
        }
    }

    /**
     * Checks if a hostname is forbidden.
     */
    private function isForbiddenHostname(string $host): bool
    {
        if ($host === 'localhost' || str_ends_with($host, '.localhost')) {
            return true;
        }
        if (str_ends_with($host, '.local') || str_ends_with($host, '.internal') || str_ends_with($host, '.onion')) {
            return true;
        }
        if ($host === 'metadata.google.internal' || $host === 'instance-data') {
            return true;
        }

        return false;
    }

    /**
     * Resolves host into a list of IPv4 and IPv6 addresses.
     *
     * @return array<string>
     */
    private function resolveHost(string $host): array
    {
        // If host is already an IP address
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return [$host];
        }

        // If a custom DNS resolver is injected, use it (crucial for DNS rebinding & offline tests)
        if (self::$dnsResolver !== null) {
            return (self::$dnsResolver)($host);
        }

        $ips = [];

        // IPv4 resolution
        $ipv4s = gethostbynamel($host);
        if (is_array($ipv4s)) {
            $ips = array_merge($ips, $ipv4s);
        }

        // IPv6 resolution if supported
        if (function_exists('dns_get_record')) {
            $records = @dns_get_record($host, DNS_AAAA);
            if (is_array($records)) {
                foreach ($records as $record) {
                    if (isset($record['ipv6'])) {
                        $ips[] = $record['ipv6'];
                    }
                }
            }
        }

        return array_unique($ips);
    }

    /**
     * Validates that an IP address is public and NOT private, loopback, link-local, or metadata.
     *
     * @throws UrlGuardException
     */
    public function validateIp(string $ip): void
    {
        // 1. General PHP validation for private and reserved ranges
        $flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
        if (filter_var($ip, FILTER_VALIDATE_IP, $flags) === false) {
            throw UrlGuardException::blockedIp($ip, 'Private, loopback, or reserved range');
        }

        // 2. Specific IPv6 loopback / unique local / link-local checks
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $lower = strtolower($ip);
            if ($lower === '::1' || $lower === '::' || str_starts_with($lower, 'fe80:') || str_starts_with($lower, 'fc00:') || str_starts_with($lower, 'fd00:')) {
                throw UrlGuardException::blockedIp($ip, 'IPv6 loopback or unique local address');
            }
        }

        // 3. Strict CIDR matching for all forbidden IPv4 ranges (especially 169.254.169.254 metadata)
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            foreach (self::FORBIDDEN_CIDRS as $cidr) {
                if ($this->ipInCidr($ip, $cidr)) {
                    throw UrlGuardException::blockedIp($ip, "Matches forbidden subnet {$cidr}");
                }
            }
        }
    }

    /**
     * Checks if an IPv4 address is inside a CIDR block.
     */
    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = explode('/', $cidr);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);

        if ($ipLong === false || $subnetLong === false) {
            return false;
        }

        $mask = -1 << (32 - (int) $bits);
        $subnetMasked = $subnetLong & $mask;

        return ($ipLong & $mask) === $subnetMasked;
    }

    /**
     * Resolves a relative or absolute redirect URL against the current base URL.
     */
    private function resolveRedirectUrl(string $baseUrl, string $location): string
    {
        if (str_starts_with($location, 'https://') || str_starts_with($location, 'http://')) {
            return $location;
        }

        $base = parse_url($baseUrl);
        $scheme = $base['scheme'] ?? 'https';
        $host = $base['host'] ?? '';
        $port = isset($base['port']) && $base['port'] !== 443 ? ':' . $base['port'] : '';

        if (str_starts_with($location, '/')) {
            return "{$scheme}://{$host}{$port}{$location}";
        }

        $path = $base['path'] ?? '/';
        $dir = dirname($path);
        $dir = $dir === '/' || $dir === '\\' ? '' : $dir;

        return "{$scheme}://{$host}{$port}{$dir}/{$location}";
    }
}
