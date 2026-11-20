@echo off
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "OUT=%ROOT%resumen_lineas_proyecto.txt"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Resolve-Path '%ROOT%').Path.TrimEnd('\');" ^
  "$excludeDirs = @('node_modules', '.next', '.git', '.vercel', 'dist', 'build', 'out', 'coverage', 'public');" ^
  "$excludeFiles = @('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'tsconfig.tsbuildinfo', 'next-env.d.ts', '.demo-runtime-state.json', 'lighthouse.json', 'lighthouse_mobile.json', '.env.local', 'contar_lineas_proyecto.bat', 'resumen_lineas_proyecto.txt');" ^
  "$binaryExts = @('.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.mp4', '.mp3');" ^
  "$rows = New-Object System.Collections.Generic.List[object];" ^
  "$stack = New-Object System.Collections.Generic.Stack[string];" ^
  "$stack.Push($root);" ^
  "while ($stack.Count -gt 0) {" ^
  "  $dir = $stack.Pop();" ^
  "  foreach ($sub in [System.IO.Directory]::GetDirectories($dir)) {" ^
  "    $name = [System.IO.Path]::GetFileName($sub);" ^
  "    if ($excludeDirs -notcontains $name) { $stack.Push($sub) }" ^
  "  };" ^
  "  foreach ($file in [System.IO.Directory]::GetFiles($dir)) {" ^
  "    $fname = [System.IO.Path]::GetFileName($file);" ^
  "    $ext = [System.IO.Path]::GetExtension($file).ToLower();" ^
  "    if (($excludeFiles -notcontains $fname) -and ($binaryExts -notcontains $ext)) {" ^
  "      $rel = $file.Substring($root.Length + 1).Replace('\', '/');" ^
  "      $count = ([System.IO.File]::ReadAllLines($file)).Length;" ^
  "      $rows.Add([PSCustomObject]@{ Archivo = $rel; Lineas = [int]$count })" ^
  "    }" ^
  "  }" ^
  "};" ^
  "$rows = $rows | Sort-Object -Property @{Expression='Lineas';Descending=$true}, @{Expression='Archivo';Descending=$false};" ^
  "$totalFiles = ($rows | Measure-Object).Count;" ^
  "$totalLines = ($rows | Measure-Object -Property Lineas -Sum).Sum;" ^
  "$maxLen = (($rows | ForEach-Object { $_.Archivo.Length } | Measure-Object -Maximum).Maximum);" ^
  "if (-not $maxLen -or $maxLen -lt 40) { $maxLen = 40 };" ^
  "$sep = ('-' * ($maxLen + 14));" ^
  "$outLines = New-Object System.Collections.Generic.List[string];" ^
  "$outLines.Add('RESUMEN DE ARCHIVOS Y LINEAS DE CODIGO DEL PROYECTO (SIN LIBRERIAS NI DEPENDENCIAS)');" ^
  "$outLines.Add('Generado: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'));" ^
  "$outLines.Add($sep);" ^
  "$outLines.Add(('Archivo').PadRight($maxLen) + ' | ' + ('Lineas').PadLeft(10));" ^
  "$outLines.Add($sep);" ^
  "foreach ($r in $rows) { $outLines.Add($r.Archivo.PadRight($maxLen) + ' | ' + $r.Lineas.ToString().PadLeft(10)) };" ^
  "$outLines.Add($sep);" ^
  "$outLines.Add(('TOTAL (' + $totalFiles + ' archivos)').PadRight($maxLen) + ' | ' + $totalLines.ToString().PadLeft(10));" ^
  "[System.IO.File]::WriteAllLines('%OUT%', $outLines, [System.Text.UTF8Encoding]::new($false));" ^
  "Write-Host ('Listo: ' + $totalFiles + ' archivos analizados, ' + $totalLines + ' lineas totales.');" ^
  "Write-Host ('Guardado en: %OUT%');"

if /I not "%~1"=="--no-pause" pause
endlocal
