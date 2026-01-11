'use client';

import React, { useEffect, useRef, useState } from 'react';

export function ExportMenu({
  onCSV,
  onXLSX,
  onPDF,
  label = 'Export',
}: {
  onCSV?: () => void | Promise<void>;
  onXLSX?: () => void | Promise<void>;
  onPDF?: () => void | Promise<void>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn-outline-purple" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
        📤 {label}
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-md)', minWidth: 160, zIndex: 10 }}>
          <button className="btn-soft" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setOpen(false); onCSV && onCSV(); }}>CSV</button>
          <button className="btn-soft" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setOpen(false); onXLSX ? onXLSX() : alert('XLSX export coming soon'); }}>XLSX</button>
          <button className="btn-soft" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setOpen(false); onPDF ? onPDF() : window.print(); }}>PDF</button>
        </div>
      )}
    </div>
  );
}

