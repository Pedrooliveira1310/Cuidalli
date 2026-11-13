param(
 [string]$Sdk = $env:ANDROID_HOME,
 [string]$Java = $env:JAVA_HOME,
 [string]$ServerUrl = 'https://cuidali-production.up.railway.app',
 [string]$OutputPath = (Join-Path $PSScriptRoot 'build/Cuidali.apk')
)
$ErrorActionPreference = 'Stop'
if (!$Sdk -and $env:LOCALAPPDATA) { $Sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
if (!$Sdk -or !$Java) { throw 'Informe -Sdk e -Java, ou configure ANDROID_HOME e JAVA_HOME.' }
if ($ServerUrl -notmatch '^https://[a-zA-Z0-9.-]+(?::[0-9]+)?/?$') { throw 'Informe uma origem HTTPS válida em -ServerUrl.' }
$key = Join-Path $PSScriptRoot 'build/cuidali-demonstracao.jks'
if (!(Test-Path -LiteralPath $key)) { throw 'Restaure a chave de assinatura da equipe em android-package/build/cuidali-demonstracao.jks. Ela não acompanha o código-fonte.' }
if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'google-services.json'))) { throw 'Obtenha google-services.json do aplicativo Android do Cuidali no Firebase.' }
$build = Join-Path $PSScriptRoot ('build/export-' + [guid]::NewGuid().ToString('N'))
$assets = Join-Path $build 'assets'
$web = Join-Path $assets 'app'
New-Item -ItemType Directory -Force $web | Out-Null
$literal = $ServerUrl.TrimEnd('/') | ConvertTo-Json -Compress
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'src/br/com/kannali/cuidali/ReleaseConfig.java'), 'package br.com.kannali.cuidali; final class ReleaseConfig { static final String SERVER = '+$literal+'; }', [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'local.properties'), 'sdk.dir='+$Sdk.Replace('\','/')+"`n", [Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'google-services.json') -Destination (Join-Path $PSScriptRoot 'app/google-services.json') -Force
$env:JAVA_HOME = $Java
$env:CUIDALI_ASSETS_DIR = $assets
$previous = $env:EXPO_PUBLIC_API_URL
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
 $env:EXPO_PUBLIC_API_URL = 'cuidali-android-same-origin'
 & node 'node_modules/expo/bin/cli' export --platform web --output-dir $web
 if ($LASTEXITCODE -ne 0) { throw 'Não foi possível gerar a interface.' }
} finally { $env:EXPO_PUBLIC_API_URL = $previous; Pop-Location }
& (Join-Path $PSScriptRoot 'gradlew.bat') -p $PSScriptRoot :app:assembleRelease --no-daemon --console=plain
if ($LASTEXITCODE -ne 0) { throw 'A compilação Android falhou.' }
$destination = [IO.Path]::GetFullPath($OutputPath)
New-Item -ItemType Directory -Force (Split-Path -Parent $destination) | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'app/build/outputs/apk/release/app-release.apk') -Destination $destination -Force
$signer = Get-ChildItem (Join-Path $Sdk 'build-tools') -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
& $signer verify $destination
if ($LASTEXITCODE -ne 0) { throw 'A verificação da assinatura falhou.' }
Write-Output "APK Cuidali: $destination"

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($destination)
try {
 if (!(@($archive.Entries | Where-Object FullName -Match "^assets/app/_expo/.+\.js$").Count)) { throw "A interface não foi incluída no APK." }
} finally { $archive.Dispose() }
