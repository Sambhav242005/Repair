from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport
from companion import server

@pytest.mark.asyncio
async def test_companion_requires_loopback_origin_and_pairing_code(tmp_path,monkeypatch):
    app=server.create_app('test-code',audit_path=tmp_path/'audit.jsonl')
    launched=[]
    monkeypatch.setattr(server,'launch_app',lambda app_id:launched.append(app_id))
    monkeypatch.setattr(server,'installed_apps',lambda:['Calculator','Notepad'])
    headers={'Origin':'http://localhost:5173','Authorization':'Bearer test-code'}
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://127.0.0.1',headers=headers) as client:
        assert (await client.get('/status')).status_code==200
        assert (await client.get('/pairing')).status_code==403
        assert (await client.get('/pairing',headers={'Host':'untrusted.example'})).status_code==400
        assert (await client.get('/status',headers={'Authorization':'Bearer wrong'})).status_code==401
        assert (await client.get('/status',headers={'Origin':'https://evil.example'})).status_code==403
        assert (await client.get('/api/v1/desktop-sessions/windows',headers={'Authorization':'Bearer wrong'})).status_code==401
        assert (await client.get('/apps')).json()['names']==['Calculator','Notepad']
        assert (await client.post('/launch',json={'app_id':'calculator'})).status_code==200
        assert launched==['calculator']
        assert (await client.post('/launch',json={'app_id':'cmd.exe /c bad'})).status_code==422
        assert (await client.post('/checks',json={'check':'arbitrary command'})).status_code==422
        assert 'test-code' not in (tmp_path/'audit.jsonl').read_text()
    async with AsyncClient(transport=ASGITransport(app=app,client=('192.168.0.8',123)),base_url='http://127.0.0.1',headers=headers) as client:
        assert (await client.get('/status')).status_code==403

def test_companion_rejects_insecure_remote_origins():
    with pytest.raises(ValueError):server.create_app('code','http://remote.example')
    with pytest.raises(ValueError):server.create_app('code','https://example.org/path')

@pytest.mark.asyncio
async def test_pairing_page_is_direct_local_only_and_disconnect_stops_sessions(monkeypatch):
    from backend.app.api import desktop
    app=server.create_app('pairing-test-code')
    stopped=[]
    async def stop():stopped.append(True)
    monkeypatch.setattr(desktop,'stop_all_desktop_sessions',stop)
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://127.0.0.1') as client:
        page=await client.get('/pairing')
        assert page.status_code==200
        assert 'pairing-test-code' in page.text
        assert page.headers['cache-control']=='no-store'
        assert (await client.get('/pairing',headers={'Sec-Fetch-Dest':'iframe'})).status_code==403
        assert (await client.get('/pairing',headers={'Sec-Fetch-Dest':'empty'})).status_code==403
        result=await client.post('/disconnect',headers={'Origin':'http://localhost:5173','Authorization':'Bearer pairing-test-code'})
        assert result.status_code==200 and stopped==[True]

@pytest.mark.asyncio
async def test_mac_companion_advertises_launch_and_reports_without_native_actions(monkeypatch):
    monkeypatch.setattr(server.platform,'system',lambda:'Darwin')
    app=server.create_app('mac-test-code')
    headers={'Origin':'http://localhost:5173','Authorization':'Bearer mac-test-code'}
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://127.0.0.1',headers=headers) as client:
        status=(await client.get('/status')).json()
        assert status['platform']=='macOS'
        assert not status['native_input_available']
        assert 'approved_desktop_sessions' not in status['capabilities']
        assert status['launchable_apps'][2]['name']=='Activity Monitor'
        assert (await client.get('/api/v1/desktop-sessions/windows')).json()==[]

def test_mac_launch_uses_a_fixed_app_name_and_no_shell(monkeypatch):
    from unittest.mock import Mock
    monkeypatch.setattr(server.platform,'system',lambda:'Darwin')
    run=Mock();monkeypatch.setattr(server.subprocess,'run',run)
    server.launch_app('settings')
    assert run.call_args.args[0]==['/usr/bin/open','-a','System Settings']
    assert not run.call_args.kwargs.get('shell',False)
    with pytest.raises(ValueError):server.launch_app('Terminal; arbitrary command')
