import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRTicketProps {
  token: string;
  bookingId: string;
  size?: number;
}

export default function QRTicket({ token, bookingId, size = 120 }: QRTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const data = JSON.stringify({ bookingId, token, issued: new Date().toISOString() });
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 1,
      color: { dark: '#1B3022', light: '#FFFFFF' },
    });
  }, [token, bookingId, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded border border-emerald-300 bg-white p-1 shadow-sm"
    />
  );
}