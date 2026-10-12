import React, { useEffect, useState } from 'react';
import { formatBytes, formatKolkata } from '../../utils/datetime';
import { companionConnection } from '../../api/companionClient';

type CompanionStatus = {connected:boolean; platform:string; version:string; launchable_apps:{id:string;name:string}[]};
export function LocalCompanionPanel({onConnectionChange}: {onConnectionChange: () => void}) {
  const [code,setCode]=useState('');
  const [status,setStatus]=useState<CompanionStatus|null>(null);
  const [device,setDevice]=useState<{manufacturer:string;model:string}|null>(null);
  const [apps,setApps]=useState<string[]>([]);
  const [check,setCheck]=useState('system_summary');
  const [report,setReport]=useState<any>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const request=async(path:string,token?:string,body?:object)=>{
    return companionConnection.request(path,{method:body?'POST':'GET',body:body?JSON.stringify(body):undefined},token);
  };
  useEffect(() => {
    if (companionConnection.connected) {
      void companionConnection.request<CompanionStatus>('/status').then(setStatus).catch(err => {
        companionConnection.disconnect(); setError(err.message || 'Pair the companion again.');
      });
    }
  }, []);
  const perform=async(operation:()=>Promise<void>)=>{
    setBusy(true);setError('');setMessage('');
    try{await operation();}catch(err:any){
      setError(err?.message==='Failed to fetch'?'Could not reach the companion. Start it on this PC, then allow local-network access if your browser asks.':err.message||'Could not reach the local companion.');
    }finally{setBusy(false);}
  };
  const disconnect=()=>{companionConnection.disconnect();setCode('');setStatus(null);setDevice(null);setApps([]);setReport(null);onConnectionChange();setMessage('Disconnected from this page. Close the companion terminal to stop local access.');};
  return <details className="local-companion-panel"><summary>Local laptop companion · {status?'paired':'connect this laptop'}</summary>
    <p>Connect the website to the companion running on this laptop to discover apps, launch supported tools, and collect diagnostics.</p>
    {error&&<p role="alert" className="planner-error">{error}</p>}{message&&<p role="status" className="planner-notice">{message}</p>}
    {!status?<><p className="field-hint">From the project folder, run <code>python -m companion.server</code>. Keep its terminal open and paste the pairing code below. The companion accepts only the website origin chosen at startup.</p>
      <p><a href="http://127.0.0.1:8765/pairing" target="_blank" rel="noopener noreferrer">Open the companion’s local pairing page</a></p>
      <form onSubmit={event=>{event.preventDefault();void perform(async()=>{
        const next=await request('/status',code);companionConnection.pair(code);setStatus(next);setCode('');onConnectionChange();
        setMessage('Connected. Choose an action below; actions are run only when you click.');
      });}}><label>Companion pairing code<input type="password" name="pairing_code" required value={code} autoComplete="off" spellCheck={false} onChange={e=>setCode(e.target.value)} /></label><button className="btn-primary" disabled={busy}>Connect this laptop</button></form></>:<>
      <p role="status">Connected to {status.platform} companion {status.version}. Pairing lasts for this page session.</p>
      {status.platform==='macOS' && <p className="planner-notice">Mac supports model detection, application lists, approved app launches, and system reports. Native Clef computer-use actions are currently available on Windows only.</p>}
      <div className="planner-actions"><button type="button" className="btn-secondary" disabled={busy} onClick={()=>void perform(async()=>{setDevice(await request('/device'));})}>Read laptop model</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={()=>void perform(async()=>{const data=await request('/apps');setApps(data.names);setMessage('Loaded apps from '+data.source+'.');})}>Show installed apps</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={()=>void perform(async()=>{await request('/disconnect',undefined,{});disconnect();})}>Disconnect</button></div>
      {device&&<p role="status"><strong>{device.manufacturer} {device.model}</strong></p>}
      {apps.length>0&&<details><summary>Installed apps ({apps.length})</summary><ul className="companion-app-list">{apps.map(name=><li key={name}>{name}</li>)}</ul></details>}
      <h3>Open an app on this laptop</h3><p className="field-hint">Clicking an app below launches it. On Windows, Calculator, Settings, and Task Manager can then be inspected in the computer-use panel. Mac apps and Notepad are launch-only.</p>
      <div className="planner-actions">{status.launchable_apps.map(app=><button type="button" key={app.id} className="btn-secondary" disabled={busy} onClick={()=>void perform(async()=>{const result=await request('/launch',undefined,{app_id:app.id});setMessage(result.message);})}>Open {app.name}</button>)}</div>
      <form onSubmit={event=>{event.preventDefault();void perform(async()=>{const result=await request('/checks',undefined,{check});setReport(result.report);setMessage('Read-only check complete. No PC settings were changed.');});}}>
        <label>Diagnostic check<select name="diagnostic_check" value={check} onChange={e=>setCheck(e.target.value)}><option value="system_summary">System summary</option><option value="memory">Memory snapshot</option><option value="storage">System disk space</option></select></label><button className="btn-primary" disabled={busy}>Run read-only check</button></form>
      <p className="field-hint">The companion runs named checks with time limits. General terminal commands are not enabled in this release. Model information and app names stay on this page unless you explicitly use another feature.</p>
      {report&&<div className="companion-report" role="status">{report.os&&<p><strong>{report.os.name} {report.os.version}</strong> · {report.cpu.logical_count} CPU threads</p>}{report.memory&&<p>Memory: {formatBytes(report.memory.available_bytes)} available of {formatBytes(report.memory.total_bytes)}</p>}{(report.disks||report.storage)?.map((disk:any,index:number)=><p key={index}>System disk: {formatBytes(disk.free_bytes)} free of {formatBytes(disk.total_bytes)}</p>)}<small>Collected: {formatKolkata(report.collected_at)}</small></div>}
    </>}
  </details>;
}
