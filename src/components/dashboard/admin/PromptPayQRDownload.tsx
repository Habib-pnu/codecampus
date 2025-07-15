
import React, { useRef } from 'react';
import PromptPayQR from './PromptPayQR';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ClassGroup } from '@/types';

interface PromptPayQRDownloadProps {
  promptPayNumber: string;
  amount: number;
  selectedClasses: ClassGroup[];
}

export const PromptPayQRDownload: React.FC<PromptPayQRDownloadProps> = ({
  promptPayNumber,
  amount,
  selectedClasses,
}) => {
  const qrImageRef = useRef<HTMLImageElement>(null);

  const handleDownload = () => {
    if (qrImageRef.current?.src) {
      const link = document.createElement('a');
      link.href = qrImageRef.current.src;
      
      const classNames = selectedClasses.map(c => c.name.replace(/[^a-zA-Z0-9]/g, '')).slice(0, 2).join('-');
      const filename = `PromptPay_CodeCampus_${classNames}_${amount.toFixed(0)}THB.png`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (amount <= 0) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-2 rounded-md border inline-block">
        <PromptPayQR
          ref={qrImageRef}
          promptPayNumber={promptPayNumber}
          amount={amount}
          size={200}
        />
      </div>
      <p className="text-sm font-semibold">Payable to: {promptPayNumber}</p>
      <p className="text-2xl font-bold">Amount: ฿{amount.toFixed(2)}</p>
      <Button onClick={handleDownload} variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Download QR Code
      </Button>
    </div>
  );
};
