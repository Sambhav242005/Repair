import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { formatKolkata } from '../../utils/datetime';
import { getDefaultDatetimeLocal } from '../../utils/datetime';
import { syllabusDemo } from './syllabusDemo';

type Topic = { title: string; lectures: number; preparation: string; source_excerpt?: string };
type Slot = { weekday: number; starts: string; minutes: number };
type Plan = { id: string; course: string; status: string; required_lectures: number; available_slots: number; unallocated_lectures: number; spare_slots: number; sessions: { title: string; instructions: string; starts_at: string; ends_at: string }[] };
type Props = { onPublished: () => Promise<void> };
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const message = (err: any) => err?.error?.message || err?.message || 'The operation could not be completed.';

export function SyllabusPlanner({ onPublished }: Props) {
  const [text, setText] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [course, setCourse] = useState('');
  const [assignee, setAssignee] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [holidays, setHolidays] = useState('');
  const [slots, setSlots] = useState<Slot[]>([{ weekday: 0, starts: '09:00', minutes: 60 }]);
  const [reminder, setReminder] = useState(15);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPlans = () => { if (apiClient.getMode() === 'live') apiClient.getTeachingPlans().then(setSavedPlans).catch(err => setError(message(err))); };
  useEffect(loadPlans, []);
  const invalidate = () => { setPlan(null); setNotice(''); };
  const perform = async (label: string, operation: () => Promise<void>) => {
    setBusy(label); setError(''); setNotice('');
    try { await operation(); } catch (err) { setError(message(err)); } finally { setBusy(''); }
  };
  const upload = (file: File, kind: 'syllabus' | 'holiday') => perform('Reading document…', async () => {
    const result = await apiClient.readTeachingDocument(file);
    invalidate();
    if (kind === 'syllabus') { setText(result.text); setTopics([]); setNotice('Document loaded. Review its text, then organize it with AI or use one topic per line.'); }
    else { setHolidays(result.holiday_dates.join('\n')); setNotice(result.holiday_dates.length ? 'Holiday dates loaded. Review them before building the schedule.' : 'No YYYY-MM-DD dates found. Enter the holiday dates below.'); }
  });
  const preview = (event: React.FormEvent) => {
    event.preventDefault();
    void perform('Building preview…', async () => {
      const holidayList = holidays.split(/[\s,;]+/).filter(Boolean);
      if (!topics.length) throw new Error('Add and review teaching topics first.');
      const next = await apiClient.previewTeachingPlan({ course, assignee, start_date: start, end_date: end,
        holidays: holidayList, slots, topics: topics.map(({title, lectures, preparation}) => ({title, lectures, preparation})), reminder_minutes: reminder });
      setPlan(next); loadPlans();
    });
  };
  return <section className="syllabus-planner" aria-labelledby="syllabus-heading">
    <header><p className="eyebrow">SYLLABUS → LECTURES → REMINDERS</p><h2 id="syllabus-heading">Finish your syllabus, one class at a time</h2><p>Upload your course document, review the topics, and fit them around your timetable and holidays. Dates use Asia/Kolkata.</p></header>
    <div className="planner-actions"><button type="button" className="btn-secondary" disabled={!!busy} onClick={()=>void perform('Preparing the demo…',async()=>{
      const demo=syllabusDemo(getDefaultDatetimeLocal().slice(0,10));
      setText(demo.topics.map(topic=>topic.title).join('\n'));setTopics(demo.topics);
      setCourse(demo.course);setAssignee(demo.assignee);setStart(demo.start_date);setEnd(demo.end_date);
      setSlots(demo.slots);setHolidays(demo.holidays.join('\n'));setReminder(demo.reminder_minutes);
      setPlan(await apiClient.previewTeachingPlan(demo));loadPlans();
      setNotice('Demo preview ready: 8 lectures, Monday/Wednesday at 09:00, with the first date excluded as a sample holiday. Scroll to step 3 to see the schedule. No demo classes or reminders have been published.');
    })}>Try a syllabus demo</button><p className="field-hint">Loads a sample six-month course and schedule preview. You can change the topics, dates, and holidays before saving.</p></div>
    {error && <p role="alert" className="planner-error">{error}</p>}
    {(notice || busy) && <p role="status" className="planner-notice">{busy || notice}</p>}
    {apiClient.getMode() !== 'live' && <p className="planner-notice">Switch to Live data to upload documents and save teaching plans.</p>}
    <fieldset disabled={!!busy} className="planner-step"><legend>1 · Upload and review your syllabus</legend>
      <label>Syllabus document<input name="syllabus" type="file" accept=".pdf,.docx,.txt,.md,.csv" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file, 'syllabus'); e.target.value = ''; }} /></label>
      <p className="field-hint">PDF with selectable text, DOCX, TXT, Markdown or CSV · up to 5 MB. For scanned PDFs, use OCR or paste the text.</p>
      <label>Syllabus text<textarea name="syllabus_text" rows={5} maxLength={60000} value={text} onChange={e => {setText(e.target.value); invalidate();}} placeholder="Paste your syllabus here, or upload a document above." /></label>
      <div className="planner-actions"><button type="button" className="btn-primary" disabled={!text.trim()} onClick={() => void perform('AI is organizing the syllabus…', async () => {
        const result = await apiClient.organizeSyllabus(text); setTopics(result.topics); invalidate(); setNotice('AI draft ready. Review every topic and lecture estimate before scheduling.');
      })}>Organize topics with AI</button><button type="button" className="btn-secondary" disabled={!text.trim()} onClick={() => {
        const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length > 200 || lines.some(line => line.length > 180)) {setError('Use at most 200 topic lines, each at most 180 characters. Split long paragraphs or use AI organization.'); return;}
        setTopics(lines.map(title => ({ title, lectures: 1, preparation: '' }))); invalidate();
      }}>Use one topic per line</button></div>
      <p className="field-hint">“Organize topics with AI” sends the syllabus text to the configured AI provider. Local document reading and manual topics work without AI.</p>
      <div className="planner-topics">{topics.map((topic, index) => <article key={index}>
        <span className="topic-index">{index + 1}</span><label>Topic {index + 1}<input name={`topic_${index}`} value={topic.title} maxLength={180} onChange={e => {setTopics(topics.map((t,i) => i === index ? {...t,title:e.target.value}:t)); invalidate();}} /></label>
        <label>Lectures<input name={`lectures_${index}`} type="number" min={1} max={40} value={topic.lectures} onChange={e => {setTopics(topics.map((t,i) => i === index ? {...t,lectures:Number(e.target.value)}:t)); invalidate();}} /></label>
        <label className="topic-preparation">Preparation / activity<input name={`preparation_${index}`} value={topic.preparation} maxLength={1000} onChange={e => {setTopics(topics.map((t,i) => i === index ? {...t,preparation:e.target.value}:t)); invalidate();}} /></label>
        <button type="button" className="btn-secondary" aria-label={`Remove topic ${index + 1}`} onClick={() => {setTopics(topics.filter((_,i) => i !== index)); invalidate();}}>Remove</button>
        {topic.source_excerpt && <small className="topic-source">From syllabus: {topic.source_excerpt}</small>}
      </article>)}</div>
      <button type="button" className="btn-secondary" onClick={() => {setTopics([...topics,{title:'',lectures:1,preparation:''}]);invalidate();}}>Add topic</button>
    </fieldset>
    <form onSubmit={preview}>
      <fieldset disabled={!!busy} className="planner-step"><legend>2 · Set semester dates and weekly class times</legend>
        <div className="planner-grid"><label>Course / section<input name="course" required maxLength={120} value={course} onChange={e=>{setCourse(e.target.value);invalidate();}} placeholder="Computer Networks · BSc semester 3" /></label>
          <label>Teacher<input name="teacher" required maxLength={120} value={assignee} onChange={e=>{setAssignee(e.target.value);invalidate();}} /></label>
          <label>First teaching date<input name="start_date" type="date" required value={start} onChange={e=>{setStart(e.target.value);invalidate();}} /></label>
          <label>Finish syllabus by<input name="end_date" type="date" required min={start || undefined} value={end} onChange={e=>{setEnd(e.target.value);invalidate();}} /></label></div>
        {slots.map((slot,index)=><div className="planner-slot" key={index}><label>Class day {index+1}<select name={`day_${index}`} value={slot.weekday} onChange={e=>{setSlots(slots.map((s,i)=>i===index?{...s,weekday:Number(e.target.value)}:s));invalidate();}}>{days.map((day,i)=><option key={day} value={i}>{day}</option>)}</select></label>
          <label>Start time<input name={`time_${index}`} type="time" required value={slot.starts} onChange={e=>{setSlots(slots.map((s,i)=>i===index?{...s,starts:e.target.value}:s));invalidate();}} /></label>
          <label>Minutes<input name={`minutes_${index}`} type="number" min={15} max={240} required value={slot.minutes} onChange={e=>{setSlots(slots.map((s,i)=>i===index?{...s,minutes:Number(e.target.value)}:s));invalidate();}} /></label>
          <button type="button" className="btn-secondary" disabled={slots.length===1} aria-label={`Remove class time ${index+1}`} onClick={()=>{setSlots(slots.filter((_,i)=>i!==index));invalidate();}}>Remove</button></div>)}
        <button type="button" className="btn-secondary" disabled={slots.length>=21} onClick={()=>{setSlots([...slots,{weekday:2,starts:'09:00',minutes:60}]);invalidate();}}>Add weekly class time</button>
        <label>Holiday / academic calendar document (optional)<input name="holiday_file" type="file" accept=".pdf,.docx,.txt,.md,.csv" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file,'holiday');e.target.value='';}} /></label>
        <label>Holidays / exams / days without classes<textarea name="holidays" rows={3} value={holidays} onChange={e=>{setHolidays(e.target.value);invalidate();}} placeholder="One date per line, for example 2026-12-25" /></label>
        <p className="field-hint">Calendar import recognizes YYYY-MM-DD dates. Review the dates above, including exam days and college closures.</p>
        <label>Remind me before each lecture<select name="reminder" value={reminder} onChange={e=>{setReminder(Number(e.target.value));invalidate();}}><option value={15}>15 minutes</option><option value={60}>1 hour</option><option value={1440}>1 day</option></select></label>
        <p className="field-hint">Reminders appear in the workspace’s alert bell while the backend runs. Each reminder includes what to teach and preparation notes.</p>
        <button type="submit" className="btn-primary">Preview lecture schedule</button>
      </fieldset>
    </form>
    {plan && <section className="planner-preview" aria-labelledby="plan-preview-heading"><h3 id="plan-preview-heading">3 · Review {plan.course}</h3>
      <p role="status">{plan.required_lectures} lectures needed · {plan.available_slots} available class times · {plan.spare_slots} spare slots</p>
      {plan.unallocated_lectures>0 && <p className="planner-error">{plan.unallocated_lectures} lectures do not fit. Add class times or adjust your topic estimates to finish the syllabus.</p>}
      <div className="planner-table"><table><thead><tr><th>Lecture</th><th>When</th><th>What to teach</th></tr></thead><tbody>{plan.sessions.map((session,index)=><tr key={index}><td>{index+1}</td><td>{formatKolkata(session.starts_at)}</td><td><strong>{session.title}</strong><p>{session.instructions}</p></td></tr>)}</tbody></table></div>
      <button type="button" className="btn-primary" disabled={!!busy || plan.status==='published' || plan.unallocated_lectures>0} onClick={()=>void perform('Saving classes…',async()=>{
        const published=await apiClient.publishTeachingPlan(plan.id);setPlan(published);loadPlans();await onPublished();setNotice('Classes saved. Topic reminders are enabled in the alert bell. Mark each class complete after teaching.');
      })}>{plan.status==='published'?'Classes saved':'Save classes and enable reminders'}</button>
    </section>}
    {savedPlans.length>0 && <details className="planner-saved"><summary>Saved teaching plans ({savedPlans.length})</summary>{savedPlans.map(item=><button key={item.id} type="button" className="btn-secondary" onClick={()=>setPlan(item)}>{item.course} · {item.status}</button>)}</details>}
  </section>;
}
