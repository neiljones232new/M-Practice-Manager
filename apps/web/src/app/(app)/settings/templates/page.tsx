'use client';

import React, { useEffect, useState } from 'react';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface TaskTemplate {
  id?: string;
  title: string;
  description?: string;
  daysBeforeDue: number;
  assignee?: string;
  priority: Priority;
  tags: string[];
}

interface ServiceTemplate {
  id: string;
  serviceKind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  taskTemplates: TaskTemplate[];
  createdAt?: string;
  updatedAt?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await api.get('/tasks/templates/service-templates');
        setTemplates(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load templates');
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateTask = (templateId: string, taskIndex: number, patch: Partial<TaskTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? {
      ...t,
      taskTemplates: t.taskTemplates.map((tt, idx) => idx === taskIndex ? { ...tt, ...patch } : tt)
    } : t));
  };

  const addTask = (templateId: string) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? {
      ...t,
      taskTemplates: [...t.taskTemplates, { title: '', description: '', daysBeforeDue: 7, priority: 'MEDIUM', tags: [] }]
    } : t));
  };

  const removeTask = (templateId: string, taskIndex: number) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? {
      ...t,
      taskTemplates: t.taskTemplates.filter((_, idx) => idx !== taskIndex)
    } : t));
  };

  const saveTemplate = async (t: ServiceTemplate) => {
    try {
      setSaving(t.id);
      await api.put(`/tasks/templates/service-templates/${t.id}`, {
        serviceKind: t.serviceKind,
        frequency: t.frequency,
        taskTemplates: t.taskTemplates.map(tt => ({
          title: tt.title,
          description: tt.description,
          daysBeforeDue: Number(tt.daysBeforeDue || 0),
          assignee: tt.assignee,
          priority: tt.priority,
          tags: Array.isArray(tt.tags) ? tt.tags : [],
        })),
      });
      alert('Template saved');
    } catch (e: any) {
      alert(e?.message || 'Failed to save template');
    } finally {
      setSaving(null);
    }
  };

  return (
    <MDJShell
      pageTitle="Service Task Templates"
      pageSubtitle="Customize the tasks auto-generated for each service"
      actions={[{ label: 'Back to Settings', href: '/settings', variant: 'outline' }]}
    >
      <hr className="mdj-gold-rule" />
      {loading ? (
        <div className="card-mdj">Loading templates…</div>
      ) : error ? (
        <div className="card-mdj" style={{ color: 'var(--danger)' }}>{error}</div>
      ) : (
        <div className="content-grid">
          {templates.map((t) => (
            <div key={t.id} className="card-mdj">
              <div className="mdj-pagehead">
                <h3 className="mdj-page-title">{t.serviceKind} — {t.frequency}</h3>
                <div className="mdj-page-actions">
                  <button className="btn-gold" onClick={() => saveTemplate(t)} disabled={saving === t.id}>{saving === t.id ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
              <hr className="mdj-gold-divider" />
              <div className="list-compact">
                {t.taskTemplates.map((tt, idx) => (
                  <div key={idx} className="item" style={{ display: 'grid', gap: '.5rem' }}>
                    <div className="row gap-2">
                      <input className="input-mdj" placeholder="Task title" value={tt.title} onChange={(e)=>updateTask(t.id, idx, { title: e.target.value })} />
                      <input className="input-mdj" placeholder="Assignee" value={tt.assignee || ''} onChange={(e)=>updateTask(t.id, idx, { assignee: e.target.value })} />
                      <select className="input-mdj" value={tt.priority} onChange={(e)=>updateTask(t.id, idx, { priority: e.target.value as Priority })}>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                      <input className="input-mdj" type="number" min={0} placeholder="Days before due" value={String(tt.daysBeforeDue)} onChange={(e)=>updateTask(t.id, idx, { daysBeforeDue: Number(e.target.value || 0) })} />
                      <button type="button" className="btn-outline-gold" onClick={()=>removeTask(t.id, idx)}>Remove</button>
                    </div>
                    <textarea className="input-mdj" placeholder="Description" value={tt.description || ''} onChange={(e)=>updateTask(t.id, idx, { description: e.target.value })} />
                    <input className="input-mdj" placeholder="Tags (comma separated)" value={(tt.tags || []).join(', ')} onChange={(e)=>updateTask(t.id, idx, { tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
                  </div>
                ))}
              </div>
              <button className="btn-outline-gold" onClick={() => addTask(t.id)} style={{ marginTop: '.5rem' }}>Add Task</button>
            </div>
          ))}
        </div>
      )}
    </MDJShell>
  );
}

