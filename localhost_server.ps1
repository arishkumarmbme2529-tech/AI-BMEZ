# =============================================================================
# AI-BMEZ: Institutional Document Verification & Regulatory Compliance System
# Full-Stack Localhost Launcher (Ports 3000 & 8000)
# =============================================================================

$ErrorActionPreference = "Continue"
$RootDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { "c:\Users\JayaPrakash\Desktop\AI-BMEZ" }
$DistDir = Join-Path $RootDir "frontend\dist"
$StaticDir = Join-Path $RootDir "localhost_app"

if (Test-Path $DistDir) {
    New-Item -ItemType Directory -Force -Path $StaticDir | Out-Null
    Copy-Item -Path (Join-Path $DistDir "*") -Destination $StaticDir -Recurse -Force
}

& node (Join-Path $RootDir "server.mjs")
