$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = [Drawing.Image]::FromFile((Join-Path $projectRoot 'mobile/assets/prototype/logo.png'))
# Recorte do símbolo original do protótipo, sem redesenhar a marca.
$crop = [Drawing.Rectangle]::new(238,80,216,224)
function Save-BrandIcon([string]$relative,[int]$size,[double]$coverage=0.9,[bool]$transparent=$false) {
 $target=Join-Path $projectRoot $relative
 New-Item -ItemType Directory -Force (Split-Path -Parent $target) | Out-Null
 $bitmap=[Drawing.Bitmap]::new($size,$size,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $graphics=[Drawing.Graphics]::FromImage($bitmap)
 try {
  $graphics.Clear($(if($transparent){[Drawing.Color]::Transparent}else{[Drawing.Color]::White}))
  $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $height=[int]($size*$coverage);$width=[int]($height*$crop.Width/$crop.Height)
  $destination=[Drawing.Rectangle]::new([int](($size-$width)/2),[int](($size-$height)/2),$width,$height)
  $graphics.DrawImage($source,$destination,$crop,[Drawing.GraphicsUnit]::Pixel)
  $bitmap.Save($target,[Drawing.Imaging.ImageFormat]::Png)
 } finally {$graphics.Dispose();$bitmap.Dispose()}
}
try {
 Save-BrandIcon 'mobile/assets/brand/logo-mark.png' 512 0.94
 Save-BrandIcon 'backend/web/favicon-brand.png' 32 0.98
 Save-BrandIcon 'backend/web/apple-touch-icon-brand.png' 180 0.9
 Save-BrandIcon 'backend/web/icon-brand-192.png' 192 0.9
 Save-BrandIcon 'backend/web/icon-brand-512.png' 512 0.9
 Save-BrandIcon 'backend/web/icon-brand-maskable.png' 512 0.65
 Save-BrandIcon 'mobile/android-package/res/drawable-nodpi/cuidali_foreground_image.png' 432 0.64 $true
 foreach($entry in @(@('mdpi',48),@('hdpi',72),@('xhdpi',96),@('xxhdpi',144),@('xxxhdpi',192))) {
  Save-BrandIcon ('mobile/android-package/res/mipmap-'+$entry[0]+'/ic_launcher.png') $entry[1] 0.9
 }
} finally {$source.Dispose()}
Write-Output 'Ícones da marca gerados para Android, favicon e instalação web.'
