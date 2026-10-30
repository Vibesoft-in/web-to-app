<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Represents each wizard step in the app-setup flow.
 * Order matters: index is used by EnsureStepAllowed middleware.
 */
enum SetupStep: string
{
    case Platform       = 'platform';
    case Connect        = 'connect';
    case Analysis       = 'analysis';
    case DataCollection = 'data-collection';
    case Theme          = 'theme';
    case Branding       = 'branding';
    case Preview        = 'preview';
    case Integrations   = 'integrations';
    case Payment        = 'payment';
    case Build          = 'build';

    /** Numeric order (0-based) for step comparison. */
    public function order(): int
    {
        return match ($this) {
            self::Platform       => 0,
            self::Connect        => 1,
            self::Analysis       => 2,
            self::DataCollection => 3,
            self::Theme          => 4,
            self::Branding       => 5,
            self::Preview        => 6,
            self::Integrations   => 7,
            self::Payment        => 8,
            self::Build          => 9,
        };
    }

    /** The step that comes after this one, or null if this is the last step. */
    public function next(): ?self
    {
        $cases = self::cases();
        $index = array_search($this, $cases, strict: true);

        return $cases[$index + 1] ?? null;
    }
}
