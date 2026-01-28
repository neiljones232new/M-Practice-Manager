'use client';

import { useBranding } from '@/contexts/BrandingContext';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function ReportHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { resolvedLogo } = useBranding();
  const [practice, setPractice] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ps, me] = await Promise.all([
          api.get('/integrations/settings/practice').catch(() => null),
          api.get('/auth/me').catch(() => null),
        ]);
        setPractice(ps);
        setUser(me);
      } catch {}
    })();
  }, []);

  const practiceName = practice?.practiceName || 'M Software Ltd';
  const practiceLines = [
    practice?.practiceAddress || '123 Business Street, London, SW1A 1AA',
    [practice?.practicePhone, practice?.practiceWebsite].filter(Boolean).join(' | ') || 'Tel: +44 (0)161 123 4567 | www.msoftware.co.uk/mpracticemanager',
  ];

  return (
    <div className="print-header" style={{ padding: '16px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={resolvedLogo} alt="Practice Logo" style={{ width: 42, height: 42 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{practiceName}</div>
          <div className="mdj-sub">{practiceLines[0]}</div>
          <div className="mdj-sub">{practiceLines[1]}</div>
        </div>
      </div>
      <hr className="mdj-gold-divider" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800 }}>{title}</div>
          {subtitle && <div className="mdj-sub">{subtitle}</div>}
        </div>
        <div className="mdj-sub">
          Generated: {new Date().toLocaleString('en-GB')}
          {user?.firstName && (
            <>
              <br />By: {user.firstName} {user.lastName || ''}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportFooter() {
  const [practice, setPractice] = useState<any>(null);
  useEffect(() => {
    api.get('/integrations/settings/practice').then(setPractice).catch(() => null);
  }, []);
  const practiceName = practice?.practiceName || 'M Software Ltd';
  return (
    <div className="print-footer" style={{ padding: '16px 8px' }}>
      <hr className="mdj-gold-divider" />
      <div className="mdj-sub">Prepared by {practiceName} — Confidential; for internal practice use only.</div>
      <div style={{ marginTop: 8 }}>
        <div className="mdj-sub">Signed electronically by:</div>
        <div style={{ fontWeight: 700 }}>Authorized Signatory</div>
      </div>
    </div>
  );
}
