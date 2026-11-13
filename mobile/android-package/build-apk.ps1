param(
    [string] $Sdk = $env:ANDROID_HOME,
    [string] $Java = $env:JAVA_HOME,
    [string] $ServerUrl = "",
    [string] $OutputPath = (Join-Path $PSScriptRoot 'build/Cuidali.apk')
)
$ErrorActionPreference = 'Stop'
if (!$Sdk -and $env:LOCALAPPDATA) { $Sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
if (!$Java) { throw 'Informe o caminho do JDK 17+ com -Java ou JAVA_HOME.' }
if (!$Sdk) { throw 'Informe o caminho do Android SDK com -Sdk ou ANDROID_HOME.' }
$platform = Join-Path $Sdk 'platforms/android-35/android.jar'
$bt = Join-Path $Sdk 'build-tools/35.0.1'
if (!(Test-Path -LiteralPath $platform) -or !(Test-Path -LiteralPath (Join-Path $bt 'aapt2.exe'))) {
    throw 'Instale a plataforma Android 35 e Build Tools 35.0.1 no SDK informado.'
}
if ($ServerUrl -and $ServerUrl -notmatch '^https://[a-zA-Z0-9.-]+(?::[0-9]+)?/?$') { throw 'Use uma origem HTTPS válida em -ServerUrl.' }
$serverLiteral = $ServerUrl.TrimEnd('/') | ConvertTo-Json -Compress
$releaseSource = 'package br.com.kannali.cuidali; final class ReleaseConfig { static final String SERVER = ' + $serverLiteral + '; }'
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'src/br/com/kannali/cuidali/ReleaseConfig.java'), $releaseSource, [Text.UTF8Encoding]::new($false))
$env:JAVA_HOME = $Java
$env:Path = (Join-Path $Java 'bin') + ';' + $env:Path
$build = Join-Path $PSScriptRoot 'build'
$build = Join-Path $build ('release-' + [guid]::NewGuid().ToString('N'))
$export = Join-Path $build 'assets/app'
$classes = Join-Path $build 'classes'
$dex = Join-Path $build 'dex'
New-Item -ItemType Directory -Force $build,$export,$classes,$dex | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$localPlatform = Join-Path $build 'android.jar'
Copy-Item -LiteralPath $platform -Destination $localPlatform -Force
$platform = $localPlatform

function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Comando de build falhou com código $LASTEXITCODE." } }
Push-Location (Split-Path -Parent $PSScriptRoot)
$previous = $env:EXPO_PUBLIC_API_URL
try {
    $env:EXPO_PUBLIC_API_URL = 'cuidali-android-same-origin'
    & node (Join-Path (Get-Location) 'node_modules/expo/bin/cli') export --platform web --output-dir $export
    Check-Exit
} finally {
    $env:EXPO_PUBLIC_API_URL = $previous
    Pop-Location
}
$html = Join-Path $export 'index.html'
$localized = [IO.File]::ReadAllText($html).Replace('<html lang="en">', '<html lang="pt-BR">').Replace('You need to enable JavaScript to run this app.', 'O Cuidali precisa de JavaScript para funcionar.')
[IO.File]::WriteAllText($html, $localized, [Text.UTF8Encoding]::new($false))
$unsigned = Join-Path $build 'unsigned.apk'
$aligned = Join-Path $build 'aligned.apk'
$res = Join-Path $build 'resources.zip'
& "$bt/aapt2.exe" compile --dir "$PSScriptRoot/res" -o $res
Check-Exit
& "$bt/aapt2.exe" link -I $platform --manifest "$PSScriptRoot/AndroidManifest.xml" -A "$build/assets" -o $unsigned $res
Check-Exit
& "$Java/bin/javac.exe" -encoding UTF-8 --release 8 -classpath $platform -d $classes @(Get-ChildItem "$PSScriptRoot/src/br/com/kannali/cuidali/*.java" | ForEach-Object FullName)
Check-Exit
& "$Java/bin/jar.exe" --create --file "$build/classes.jar" -C $classes .
Check-Exit
& "$bt/d8.bat" --lib $platform --min-api 24 --output $dex "$build/classes.jar"
Check-Exit
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($unsigned, [IO.Compression.ZipArchiveMode]::Update)
try {
    # aapt2 on Windows may emit backslashes, which Android AssetManager cannot resolve.
    foreach ($entry in @($archive.Entries)) {
        if ($entry.FullName.Contains('\')) {
            $fixedName = $entry.FullName.Replace('\', '/')
            $memory = [IO.MemoryStream]::new()
            $inputStream = $entry.Open()
            try { $inputStream.CopyTo($memory) } finally { $inputStream.Dispose() }
            $entry.Delete()
            $fixedEntry = $archive.CreateEntry($fixedName)
            $outputStream = $fixedEntry.Open()
            try { $memory.Position = 0; $memory.CopyTo($outputStream) }
            finally { $outputStream.Dispose(); $memory.Dispose() }
        }
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, "$dex/classes.dex", 'classes.dex') | Out-Null
} finally { $archive.Dispose() }
& "$bt/zipalign.exe" -f 4 $unsigned $aligned
Check-Exit
$key = Join-Path $PSScriptRoot 'build/cuidali-demonstracao.jks'
if (!(Test-Path -LiteralPath $key)) {
    & "$Java/bin/keytool.exe" -genkeypair -keystore $key -storepass android -keypass android -alias cuidali-demo `
        -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Cuidali Demonstracao,O=Kannali Corp,C=BR'
    Check-Exit
}
$destination = [IO.Path]::GetFullPath($OutputPath)
New-Item -ItemType Directory -Force (Split-Path -Parent $destination) | Out-Null
& "$bt/apksigner.bat" sign --ks $key --ks-key-alias cuidali-demo --ks-pass pass:android --key-pass pass:android --out $destination $aligned
Check-Exit
& "$bt/apksigner.bat" verify --verbose $destination
Check-Exit
Write-Output "APK Cuidali: $destination"

