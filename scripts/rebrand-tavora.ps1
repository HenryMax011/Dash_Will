#Requires -Version 5.1
<#
.SYNOPSIS
  Substitui a marca "Dias&Dantas" por "Tavora&Dantas" em ficheiros de texto do site.

.DESCRIPTION
  Aplica sequências na ordem correta (entidade HTML antes do e comercial literais).
  Não mexe em "42 dias" (métrica). Predefinição: raiz = pasta mãe de scripts\.

.EXAMPLE
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\scripts\rebrand-tavora.ps1

.EXAMPLE
  .\scripts\rebrand-tavora.ps1 -UpdateEmail

.EXAMPLE
  .\scripts\rebrand-tavora.ps1 -Root "D:\caminho\outro\site"
#>
[CmdletBinding()]
param(
  [Parameter()]
  [Alias("Root")]
  [string] $SiteRoot = $null,
  [switch] $UpdateEmail
)

$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $scriptRoot) { $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path }
$defaultRoot = Split-Path -Parent $scriptRoot
if (-not $SiteRoot) { $SiteRoot = $defaultRoot }
$resolvedRoot = [System.IO.Path]::GetFullPath($SiteRoot)

$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Apply-Rebrand {
  param([string] $Text)
  $n = 0
  $out = $Text
  $pairs = [ordered]@{
    "Dias&amp;Dantas" = "Tavora&amp;Dantas"
    "Dias&Dantas"    = "Tavora&Dantas"
    "Dias e Dantas"  = "Tavora e Dantas"
  }
  foreach ($k in $pairs.Keys) {
    $c = [regex]::Matches($out, [regex]::Escape($k)).Count
    if ($c -gt 0) {
      $out = $out -replace [regex]::Escape($k), $pairs[$k]
      $n += $c
    }
  }
  if ($UpdateEmail) {
    $eOld = "diasedantas.com.br"
    $eNew = "tavoraedantas.com.br"
    $c = [regex]::Matches($out, [regex]::Escape($eOld)).Count
    if ($c -gt 0) {
      $out = $out -replace [regex]::Escape($eOld), $eNew
      $n += $c
    }
  }
  return @{
    Text         = $out
    Replacements = $n
  }
}

if (-not (Test-Path -LiteralPath $resolvedRoot -PathType Container)) {
  Write-Error "Diretório inexistente: $resolvedRoot"
  exit 1
}

$pattern = Join-Path $resolvedRoot "*"
$files = Get-ChildItem -Path $pattern -Recurse -File -Include *.html, *.js, *.css, *.md, *.json -ErrorAction SilentlyContinue
$files = $files | Where-Object {
  $p = $_.FullName
  -not ($p -match "[\\/]\.git[\\/]") -and
  -not ($p -match "[\\/]node_modules[\\/]") -and
  -not ($p -match "[\\/]scripts[\\/]")
}

$totalRepl = 0
$changed = @()
foreach ($f in $files) {
  $raw = [System.IO.File]::ReadAllText($f.FullName, $Utf8NoBom)
  $r = Apply-Rebrand -Text $raw
  if ($r.Text -ne $raw) {
    $totalRepl += $r.Replacements
    [System.IO.File]::WriteAllText($f.FullName, $r.Text, $Utf8NoBom)
    $changed += $f.FullName
    Write-Host "Atualizado: $($f.FullName) ($($r.Replacements) blocos substituídos)"
  }
}
if ($changed.Count -eq 0) {
  Write-Host "Nenhum ficheiro alterado (já rebrandeado ou sem correspondências) em: $resolvedRoot"
} else {
  Write-Host "Concluído. Ficheiros alterados: $($changed.Count); total de blocos: $totalRepl"
}
