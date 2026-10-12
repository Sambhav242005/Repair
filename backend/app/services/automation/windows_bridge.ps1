param([Parameter(Mandatory=$true)][string]$RequestPath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class RepairWindow {
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
}
'@
$request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
$root = [System.Windows.Automation.AutomationElement]::RootElement
function AppName($element) {
    $id = $element.Current.ProcessId
    $proc = Get-Process -Id $id -ErrorAction Stop
    switch ($proc.ProcessName.ToLowerInvariant()) {
        'calculatorapp' { return 'Calculator' }
        'calculator' { return 'Calculator' }
        'taskmgr' { return 'TaskManager' }
        'systemsettings' { return 'Settings' }
        'applicationframehost' {
            # UWP Calculator can expose a frame-host top level. Require its child identity.
            $children = $element.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
            foreach ($child in $children) {
                if ($child.Current.AutomationId -eq 'CalculatorResults') {
                    $childProcess = Get-Process -Id $child.Current.ProcessId -ErrorAction Stop
                    if ($childProcess.ProcessName.ToLowerInvariant() -in @('calculatorapp','calculator')) { return 'Calculator' }
                }
            }
        }
    }
    return $null
}
if ($request.operation -eq 'windows') {
    $items = @()
    $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
    foreach ($window in $windows) {
        try {
            $app = AppName $window
            if ($app -and $window.Current.NativeWindowHandle -gt 0 -and [RepairWindow]::IsWindowVisible([IntPtr]$window.Current.NativeWindowHandle) -and -not $window.Current.IsOffscreen) {
                $items += @{handle=$window.Current.NativeWindowHandle; process_id=$window.Current.ProcessId; application=$app}
            }
        } catch { }
    }
    ConvertTo-Json -InputObject @($items) -Depth 8 -Compress
    exit
}
$window = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr][long]$request.window.handle)
if ($null -eq $window -or $window.Current.ProcessId -ne $request.window.process_id -or (AppName $window) -ne $request.window.application) { throw 'Selected window identity changed.' }
if ($window.Current.IsOffscreen -or -not [RepairWindow]::IsWindowVisible([IntPtr]$request.window.handle)) { throw 'Selected window is not visible.' }
$elements = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
$records = @()
$targets = @{}
foreach ($element in $elements) {
    if ($records.Count -ge 200) { break }
    try {
        $current = $element.Current
        if ($current.IsOffscreen -or $current.IsPassword) { continue }
        $runtime = ($element.GetRuntimeId() -join '.')
        $operations = @()
        foreach ($entry in @(@('invoke',[System.Windows.Automation.InvokePattern]::Pattern),@('select',[System.Windows.Automation.SelectionItemPattern]::Pattern),@('text',[System.Windows.Automation.ValuePattern]::Pattern),@('scroll',[System.Windows.Automation.ScrollPattern]::Pattern))) {
            $pattern = $null
            if ($element.TryGetCurrentPattern($entry[1],[ref]$pattern)) {
                if ($entry[0] -ne 'text' -or -not $pattern.Current.IsReadOnly) { $operations += $entry[0] }
            }
        }
        # No free-form value text, titles, paths or password controls leave the adapter.
        $name = $current.Name
        if ($current.ControlType -eq [System.Windows.Automation.ControlType]::Edit) { $name = '' }
        if ($name.Length -gt 200 -or $name -match '[/\\]|@') { $name = '[redacted]' }
        $records += @{id=$runtime;automation_id=$current.AutomationId;name=$name;kind=$current.ControlType.ProgrammaticName;enabled=$current.IsEnabled;operations=@($operations)}
        $targets[$runtime] = $element
    } catch { }
}
if ($request.operation -eq 'observe') {
    if ($records.Count -eq 0) { throw 'Selected application exposes no usable UI Automation controls.' }
    ConvertTo-Json -InputObject @{controls=@($records)} -Depth 8 -Compress
    exit
}
if ($request.operation -eq 'screenshot') {
    if (@($elements | Where-Object {$_.Current.IsPassword}).Count -gt 0) { throw 'Password field prevents screenshot.' }
    Add-Type -AssemblyName System.Drawing
    $bounds = $window.Current.BoundingRectangle
    if ($bounds.Width -le 0 -or $bounds.Height -le 0 -or $bounds.Width * $bounds.Height -gt 16000000) { throw 'Invalid screenshot bounds.' }
    $bitmap = New-Object System.Drawing.Bitmap ([int]$bounds.Width),([int]$bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = New-Object System.IO.MemoryStream
    try {
        # Render selected HWND only: never capture foreground overlays or other apps.
        $dc = $graphics.GetHdc()
        try {
            if (-not [RepairWindow]::PrintWindow([IntPtr]$request.window.handle,$dc,0)) { throw 'Selected window does not support safe capture.' }
        } finally { $graphics.ReleaseHdc($dc) }
        $bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
        ConvertTo-Json -InputObject @{png=[Convert]::ToBase64String($stream.ToArray())} -Compress
    } finally { $graphics.Dispose(); $bitmap.Dispose(); $stream.Dispose() }
    exit
}
# Stop/freshness checks occur again inside the process immediately before input.
if (Test-Path -LiteralPath $request.stop_path) { throw 'Session stopped.' }
$expires = [DateTimeOffset]::Parse($request.expires_at)
if ([DateTimeOffset]::UtcNow -gt $expires) { throw 'Snapshot expired.' }
$target = $targets[$request.target.id]
if ($null -eq $target -or -not $target.Current.IsEnabled -or $target.Current.IsOffscreen -or $target.Current.IsPassword) { throw 'Target unavailable.' }
if ($target.Current.AutomationId -ne $request.target.automation_id -or $target.Current.Name -ne $request.target.name) { throw 'Target changed.' }
$app = $request.window.application
$aid = $target.Current.AutomationId
# Host policy is repeated here, not left to AI or the Python caller.
if ($app -eq 'Calculator') {
    if ($request.operation -notin @('invoke','key','text') -or $aid -notmatch '^(num[0-9]Button|clearButton|plusButton|minusButton|multiplyButton|divideButton|equalButton|decimalSeparatorButton)$') { throw 'Calculator action denied.' }
} else {
    if ($request.operation -notin @('invoke','select','scroll') -or $aid -notin @('Performance','PerformanceButton','NavigationViewItemPerformance','NavPerformance','System','SystemSettings_System','Memory','Cpu','CPU','SettingsPageScrollViewer')) { throw 'Read-only diagnostic action denied.' }
}
if (Test-Path -LiteralPath $request.stop_path) { throw 'Session stopped.' }
switch ($request.operation) {
    'text' {
        if ($request.argument -notmatch '^[0-9]{1,16}$' -or $aid -ne ('num'+$request.argument.Substring(0,1)+'Button')) { throw 'Only grounded bounded Calculator digits are allowed.' }
        foreach ($digit in $request.argument.ToCharArray()) {
            if ((Test-Path -LiteralPath $request.stop_path) -or [DateTimeOffset]::UtcNow -gt $expires) { throw 'Stopped or expired during text input.' }
            $condition = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::AutomationIdProperty),('num'+$digit+'Button')
            $button = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$condition)
            if ($null -eq $button -or $button.Current.IsOffscreen -or -not $button.Current.IsEnabled) { throw 'Digit control unavailable.' }
            $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
        }
    }
    'invoke' { $target.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
    'select' { $target.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() }
    'scroll' {
        if ($request.argument -notin @('up','down')) { throw 'Invalid scroll.' }
        $amount = [System.Windows.Automation.ScrollAmount]::SmallIncrement
        if ($request.argument -eq 'up') { $amount = [System.Windows.Automation.ScrollAmount]::SmallDecrement }
        $target.GetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern).Scroll([System.Windows.Automation.ScrollAmount]::NoAmount,$amount)
    }
    'key' {
        # Calculator keys are grounded in the matching button and invoked through UIA.
        $map = @{ENTER='equalButton';ESC='clearButton'}
        if ($map[$request.argument] -ne $aid) { throw 'Key not permitted for target.' }
        $target.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    }
    default { throw 'Unsupported action.' }
}
ConvertTo-Json -InputObject @{receipt='input_requested'} -Compress
