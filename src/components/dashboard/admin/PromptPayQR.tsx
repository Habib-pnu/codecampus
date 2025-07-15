import React, { useEffect, useState, forwardRef } from "react";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

interface PromptPayQRProps {
  promptPayNumber: string;
  amount: number;
  size?: number;
}

const PromptPayQR = forwardRef<HTMLImageElement, PromptPayQRProps>(
  ({ promptPayNumber, amount, size = 128 }, ref) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
      if (!promptPayNumber || !amount) {
        setQrDataUrl("");
        return;
      }
      const payload = generatePayload(promptPayNumber, { amount });
      QRCode.toDataURL(payload, { width: size, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    }, [promptPayNumber, amount, size]);

    if (!qrDataUrl) return null;

    return <img ref={ref} src={qrDataUrl} alt="PromptPay QR Code" width={size} height={size} />;
  }
);

export default PromptPayQR;
