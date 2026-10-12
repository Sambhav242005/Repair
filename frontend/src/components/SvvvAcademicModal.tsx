import React, { useEffect } from 'react';
import { BookOpen, CheckCircle2, X } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void }

export const SvvvAcademicModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="project-notes-modal" role="dialog" aria-modal="true" aria-labelledby="project-notes-title" aria-describedby="project-notes-description">
        <header><div className="notes-icon"><BookOpen size={21} /></div><div><p className="eyebrow">PROJECT NOTES</p><h2 id="project-notes-title">Repair Before Replace</h2></div><button className="icon-action" onClick={onClose} aria-label="Close project notes"><X size={18} /></button></header>
        <p id="project-notes-description">A faculty workspace for recording equipment problems, reviewing troubleshooting guidance, and planning classes and lab work.</p>
        <div className="notes-grid">
          <article><h3><CheckCircle2 size={17} /> Repair cases</h3><p>Teachers record symptoms and review model-assisted steps, uncertainties, and stop conditions before guiding students.</p></article>
          <article><h3><CheckCircle2 size={17} /> Native desktop helper</h3><p>Computer use inspects a selected local app, prepares a bounded plan, and waits for teacher approval before sending input.</p></article>
          <article><h3><CheckCircle2 size={17} /> Class and lab planning</h3><p>Schedule teaching sessions, equipment care, and shared machine time. Conflict checks use Asia/Kolkata entry fields and timezone-aware backend timestamps.</p></article>
          <article><h3><CheckCircle2 size={17} /> Evidence and limits</h3><p>Sample data is labelled. Material mass is not a classroom repair score, and no carbon claim is shown without a documented method. A real Calculator input run still needs live desktop acceptance.</p></article>
        </div>
        <footer><span>Technical verification is reported by the local build and test commands; this note does not claim a test result.</span><button className="btn-primary" onClick={onClose}>Back to workspace</button></footer>
      </section>
    </div>
  );
};
