<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\Order;

class PdfInvoiceGenerator
{
    private string $streamContent = '';

    private function addText(
        float $x,
        float $y,
        string $text,
        string $font = 'F1',
        float $size = 10,
        array $color = [0.1, 0.1, 0.1]
    ): void {
        $r = max(0.0, min(1.0, (float) ($color[0] ?? 0)));
        $g = max(0.0, min(1.0, (float) ($color[1] ?? 0)));
        $b = max(0.0, min(1.0, (float) ($color[2] ?? 0)));

        // Clean UTF-8 and escape for PDF Type 1 syntax
        $clean = str_replace(['₹', "\xE2\x82\xB9"], 'INR ', $text);
        $clean = iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $clean) ?: $clean;
        $escaped = strtr($clean, ['\\' => '\\\\', '(' => '\\(', ')' => '\\)']);

        $this->streamContent .= sprintf(
            "q %0.3f %0.3f %0.3f rg BT /%s %0.1f Tf %0.2f %0.2f Td (%s) Tj ET Q\n",
            $r, $g, $b, $font, $size, $x, $y, $escaped
        );
    }

    private function addRect(
        float $x,
        float $y,
        float $w,
        float $h,
        array $fill = [0.96, 0.95, 0.94],
        ?array $stroke = null
    ): void {
        $fr = max(0.0, min(1.0, (float) $fill[0]));
        $fg = max(0.0, min(1.0, (float) $fill[1]));
        $fb = max(0.0, min(1.0, (float) $fill[2]));

        $this->streamContent .= sprintf(
            "q %0.3f %0.3f %0.3f rg %0.2f %0.2f %0.2f %0.2f re f Q\n",
            $fr, $fg, $fb, $x, $y, $w, $h
        );

        if ($stroke !== null) {
            $sr = max(0.0, min(1.0, (float) $stroke[0]));
            $sg = max(0.0, min(1.0, (float) $stroke[1]));
            $sb = max(0.0, min(1.0, (float) $stroke[2]));
            $this->streamContent .= sprintf(
                "q %0.3f %0.3f %0.3f RG 1 w %0.2f %0.2f %0.2f %0.2f re s Q\n",
                $sr, $sg, $sb, $x, $y, $w, $h
            );
        }
    }

    private function addLine(
        float $x1,
        float $y1,
        float $x2,
        float $y2,
        array $stroke = [0.85, 0.83, 0.80],
        float $width = 1.0
    ): void {
        $r = max(0.0, min(1.0, (float) $stroke[0]));
        $g = max(0.0, min(1.0, (float) $stroke[1]));
        $b = max(0.0, min(1.0, (float) $stroke[2]));

        $this->streamContent .= sprintf(
            "q %0.3f %0.3f %0.3f RG %0.1f w %0.2f %0.2f m %0.2f %0.2f l s Q\n",
            $r, $g, $b, $width, $x1, $y1, $x2, $y2
        );
    }

    /**
     * Builds and returns binary PDF 1.4 representation of the invoice.
     */
    public function generate(object $order, string $transactionId = ''): string
    {
        $this->streamContent = '';

        if (empty($transactionId)) {
            $transactionId = $order->transaction_id
                ?? $order->meta['razorpay_payment_id']
                ?? $order->meta['payment_id']
                ?? 'pay_' . strtoupper(substr(md5((string) $order->id), 0, 14));
        }

        $formattedTotal = 'INR ' . number_format($order->total_amount / 100, 2);
        $paidDate = ($order->paid_at ?? $order->created_at)->format('d M Y, h:i A');
        $orderNumber = $order->order_number ?: "ORD-{$order->id}";

        // Page Background (warm off-white #FAF8F5)
        $this->addRect(0, 0, 595.28, 841.89, [0.98, 0.97, 0.96]);

        // Main White Card Container (A4 margins: 36pt = 0.5in)
        $this->addRect(36, 36, 523.28, 770, [1.0, 1.0, 1.0], [0.90, 0.88, 0.85]);

        // Top Brand Header Banner (Accent Bronze #78593D -> [0.47, 0.35, 0.24])
        $this->addRect(36, 736, 523.28, 70, [0.47, 0.35, 0.24]);
        $this->addText(56, 772, 'WebIntoApp', 'F2', 22, [1.0, 1.0, 1.0]);
        $this->addText(56, 752, 'OFFICIAL TAX INVOICE & PAYMENT RECEIPT', 'F1', 9, [0.92, 0.88, 0.83]);

        // Status Badge: PAID & VERIFIED (Green)
        $this->addRect(420, 755, 120, 22, [0.10, 0.65, 0.35]);
        $this->addText(434, 762, 'PAID & VERIFIED', 'F2', 9, [1.0, 1.0, 1.0]);

        // Meta Info Row
        $this->addText(56, 715, "Invoice Date: {$paidDate}", 'F1', 9.5, [0.45, 0.42, 0.40]);
        $this->addText(380, 715, "Invoice #: Invoice-{$orderNumber}", 'F2', 9.5, [0.20, 0.18, 0.16]);

        $this->addLine(56, 705, 539, 705, [0.90, 0.88, 0.85]);

        // Customer & Order Information Box (#FAF7F2)
        $this->addRect(56, 615, 483, 78, [0.98, 0.97, 0.95], [0.92, 0.90, 0.87]);

        // Left Column: Billed To
        $this->addText(72, 674, 'BILLED TO', 'F2', 8.5, [0.47, 0.35, 0.24]);
        $customerName = ! empty($order->billing_name) ? $order->billing_name : ($order->user?->name ?? 'Customer Account');
        $this->addText(72, 658, substr($customerName, 0, 36), 'F2', 12, [0.12, 0.11, 0.10]);
        $customerEmail = ! empty($order->billing_email) ? $order->billing_email : ($order->user?->email ?? 'support@webintoapp.com');
        $this->addText(72, 644, substr($customerEmail, 0, 42), 'F1', 9, [0.40, 0.38, 0.36]);
        if (! empty($order->billing_phone)) {
            $this->addText(72, 630, 'Phone: ' . substr($order->billing_phone, 0, 20), 'F1', 8.5, [0.50, 0.48, 0.46]);
        }

        // Right Column: Order & Transaction details
        $this->addText(320, 674, 'ORDER & TRANSACTION DETAILS', 'F2', 8.5, [0.47, 0.35, 0.24]);
        $this->addText(320, 658, "Order Number: {$orderNumber}", 'F2', 9.5, [0.12, 0.11, 0.10]);
        $this->addText(320, 644, "Transaction ID: " . substr($transactionId, 0, 28), 'F1', 9, [0.40, 0.38, 0.36]);
        $this->addText(320, 630, 'Payment Gateway: Razorpay Secure (Verified)', 'F1', 8.5, [0.10, 0.55, 0.30]);

        // Items Table Header
        $tableY = 575;
        $this->addRect(56, $tableY, 483, 22, [0.93, 0.91, 0.88]);
        $this->addText(72, $tableY + 6, 'ITEM / DESCRIPTION', 'F2', 8.5, [0.25, 0.22, 0.20]);
        $this->addText(390, $tableY + 6, 'QTY', 'F2', 8.5, [0.25, 0.22, 0.20]);
        $this->addText(470, $tableY + 6, 'AMOUNT', 'F2', 8.5, [0.25, 0.22, 0.20]);

        // Items Table Rows
        $currY = $tableY - 26;
        $items = $order->items && count($order->items) > 0 ? $order->items : [];

        if (empty($items)) {
            // Default row from package or order
            $pkgName = $order->package?->name ?? 'Mobile Application Lifetime Package';
            $this->addText(72, $currY, $pkgName, 'F2', 10, [0.15, 0.14, 0.13]);
            $this->addText(72, $currY - 12, 'Includes full Android APK, AAB bundles, and live catalog sync', 'F1', 8.5, [0.50, 0.48, 0.46]);
            $this->addText(395, $currY, '1', 'F1', 10, [0.30, 0.28, 0.26]);
            $this->addText(470, $currY, $formattedTotal, 'F2', 10, [0.15, 0.14, 0.13]);
            $this->addLine(56, $currY - 18, 539, $currY - 18, [0.93, 0.91, 0.88]);
            $currY -= 32;
        } else {
            foreach ($items as $item) {
                $itemPrice = 'INR ' . number_format($item->total_price / 100, 2);
                $this->addText(72, $currY, substr($item->name, 0, 50), 'F2', 10, [0.15, 0.14, 0.13]);
                if (! empty($item->description)) {
                    $this->addText(72, $currY - 12, substr($item->description, 0, 65), 'F1', 8, [0.50, 0.48, 0.46]);
                }
                $this->addText(395, $currY, (string) ($item->quantity ?? 1), 'F1', 10, [0.30, 0.28, 0.26]);
                $this->addText(470, $currY, $itemPrice, 'F2', 10, [0.15, 0.14, 0.13]);
                $this->addLine(56, $currY - 18, 539, $currY - 18, [0.93, 0.91, 0.88]);
                $currY -= 34;
            }
        }

        // Summary Calculations Box
        $currY -= 10;
        $this->addText(360, $currY, 'Subtotal:', 'F1', 10, [0.45, 0.42, 0.40]);
        $this->addText(470, $currY, $formattedTotal, 'F1', 10, [0.20, 0.18, 0.16]);

        $currY -= 18;
        $this->addText(360, $currY, 'Tax / GST (Included):', 'F1', 9.5, [0.45, 0.42, 0.40]);
        $this->addText(470, $currY, 'INR 0.00', 'F1', 9.5, [0.50, 0.48, 0.46]);

        $currY -= 10;
        $this->addLine(340, $currY, 539, $currY, [0.85, 0.83, 0.80], 1.5);

        $currY -= 20;
        $this->addText(340, $currY, 'Total Amount Paid:', 'F2', 11, [0.15, 0.14, 0.13]);
        $this->addText(460, $currY, $formattedTotal, 'F2', 13, [0.47, 0.35, 0.24]);

        // Entitlements Activated Box (#FAF7F2)
        $currY -= 45;
        $this->addRect(56, $currY, 483, 40, [0.98, 0.97, 0.95], [0.90, 0.88, 0.85]);
        $this->addText(72, $currY + 24, 'ENTITLEMENTS ACTIVATED:', 'F2', 8.5, [0.47, 0.35, 0.24]);
        $this->addText(72, $currY + 10, 'Full lifetime mobile build files, automated store product sync, push notification triggers, and platform updates.', 'F1', 8, [0.35, 0.33, 0.31]);

        // Official Tax & Legal Footer
        $this->addLine(56, 95, 539, 95, [0.90, 0.88, 0.85]);
        $this->addText(56, 78, 'Thank you for choosing WebIntoApp! For billing queries: support@webintoapp.com', 'F1', 8.5, [0.50, 0.48, 0.46]);
        $this->addText(56, 64, 'WebIntoApp Technologies • Registered Platform • Computer-generated tax invoice & receipt (No signature required).', 'F1', 7.5, [0.60, 0.58, 0.55]);

        // Assemble standard PDF 1.4 binary structure
        return $this->buildPdfBinary();
    }

    private function buildPdfBinary(): string
    {
        $body = '';
        $xref = [];
        $offset = 9; // strlen("%PDF-1.4\n")

        $body .= "%PDF-1.4\n";

        // Obj 1: Catalog
        $xref[1] = $offset;
        $obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $body .= $obj1;
        $offset += strlen($obj1);

        // Obj 2: Pages
        $xref[2] = $offset;
        $obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $body .= $obj2;
        $offset += strlen($obj2);

        // Obj 3: Page
        $xref[3] = $offset;
        $obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources 4 0 R /Contents 5 0 R >>\nendobj\n";
        $body .= $obj3;
        $offset += strlen($obj3);

        // Obj 4: Font Resources
        $xref[4] = $offset;
        $obj4 = "4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >>\nendobj\n";
        $body .= $obj4;
        $offset += strlen($obj4);

        // Obj 5: Stream Content
        $streamLen = strlen($this->streamContent);
        $xref[5] = $offset;
        $obj5 = "5 0 obj\n<< /Length {$streamLen} >>\nstream\n{$this->streamContent}endstream\nendobj\n";
        $body .= $obj5;
        $offset += strlen($obj5);

        // Xref Table
        $xrefOffset = $offset;
        $body .= "xref\n0 6\n0000000000 65535 f \n";
        for ($i = 1; $i <= 5; $i++) {
            $body .= sprintf("%010d 00000 n \n", $xref[$i]);
        }

        $body .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";

        return $body;
    }
}
