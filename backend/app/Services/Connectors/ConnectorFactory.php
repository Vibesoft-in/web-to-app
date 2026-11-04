<?php

declare(strict_types=1);

namespace App\Services\Connectors;

use App\Enums\Platform;
use App\Models\App;
use App\Models\Connection;
use App\Services\Connectors\Shopify\ShopifyConnector;
use App\Services\Connectors\Woo\WooConnector;
use App\Services\Security\CredentialVault;
use App\Services\Security\UrlGuard;
use InvalidArgumentException;

class ConnectorFactory
{
    public function __construct(
        private readonly CredentialVault $vault = new CredentialVault(),
        private readonly UrlGuard $urlGuard = new UrlGuard()
    ) {}

    /**
     * Resolves the connector for an existing App or Connection model.
     */
    public function make(App|Connection $subject): ConnectorInterface
    {
        /** @var Connection|null $connection */
        $connection = $subject instanceof App ? $subject->connection : $subject;

        if (! $connection) {
            $identifier = $subject instanceof App ? $subject->ulid : 'unknown';
            throw new InvalidArgumentException("Connection not found for {$identifier}.");
        }

        $credentials = is_array($connection->credentials)
            ? $connection->credentials
            : $this->vault->decrypt((string) $connection->credentials);

        return $this->makeForPlatform(
            platform: $connection->platform instanceof Platform ? $connection->platform->value : (string) $connection->platform,
            siteUrl: $connection->site_url,
            credentials: $credentials
        );
    }

    /**
     * Instantiates a connector from platform name, site URL, and decrypted credentials.
     *
     * @param array<string, mixed> $credentials
     */
    public function makeForPlatform(
        string $platform,
        string $siteUrl,
        array $credentials
    ): ConnectorInterface {
        $platformKey = strtolower($platform);

        if ($platformKey === 'woo' || $platformKey === 'woocommerce' || $platformKey === 'wordpress' || $platformKey === 'wp') {
            return new WooConnector(
                siteUrl: $siteUrl,
                consumerKey: (string) ($credentials['consumer_key'] ?? $credentials['ck'] ?? ''),
                consumerSecret: (string) ($credentials['consumer_secret'] ?? $credentials['cs'] ?? ''),
                urlGuard: $this->urlGuard
            );
        }

        if ($platformKey === 'shopify') {
            return new ShopifyConnector(
                siteUrl: $siteUrl,
                consumerKey: (string) ($credentials['consumer_key'] ?? $credentials['access_token'] ?? $credentials['api_key'] ?? ''),
                consumerSecret: (string) ($credentials['consumer_secret'] ?? $credentials['secret_key'] ?? ''),
                urlGuard: $this->urlGuard
            );
        }

        throw new InvalidArgumentException("Unsupported connector platform: '{$platform}'");
    }
}
