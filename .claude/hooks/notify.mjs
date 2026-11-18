import { spawn } from "node:child_process"

// Title and message travel through env vars so their text is never parsed as PowerShell code.
const SHOW_BALLOON = `
Add-Type -AssemblyName System.Windows.Forms
$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Icon = [System.Drawing.SystemIcons]::Information
$icon.Visible = $true
$icon.ShowBalloonTip(5000, $env:NOTIFY_TITLE, $env:NOTIFY_MESSAGE, 'Info')
Start-Sleep -Seconds 6
$icon.Dispose()
`

let raw = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
	raw += chunk
})
process.stdin.on("end", () => {
	const { title, message } = JSON.parse(raw)
	const child = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", SHOW_BALLOON], {
		detached: true,
		stdio: "ignore",
		windowsHide: true,
		env: {
			...process.env,
			NOTIFY_TITLE: title || "Claude Code",
			NOTIFY_MESSAGE: message,
		},
	})
	child.unref()
})
