<#
  SOKO Development - photo optimizer
  Resizes a raw phone photo for the web and bakes in EXIF rotation so
  nothing comes out sideways. Originals are never modified.

  Usage:
    powershell -File tools\optimize-photo.ps1 -Source "assets\Kitchen 1.jpg" -Dest "assets\work-build-kitchens-1.jpg"

  Optional: -MaxSide 1400  -Quality 82
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Dest,
  [int]$MaxSide = 1400,
  [int]$Quality = 82
)

Add-Type -AssemblyName System.Drawing

$src = (Resolve-Path -LiteralPath $Source).Path
$img = [System.Drawing.Image]::FromFile($src)

try {
  # --- Apply EXIF orientation (tag 274). Phones often store 6 or 8. ---
  if ($img.PropertyIdList -contains 274) {
    switch ($img.GetPropertyItem(274).Value[0]) {
      2 { $img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
      3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      4 { $img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipY) }
      5 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
      6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      7 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
      8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }
  }

  # --- Scale so the long side is $MaxSide. Never upscale. ---
  $scale = [Math]::Min(1.0, $MaxSide / [Math]::Max($img.Width, $img.Height))
  $w = [int][Math]::Round($img.Width * $scale)
  $h = [int][Math]::Round($img.Height * $scale)

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $bmp.SetResolution(72, 72)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)))
  $g.Dispose()

  # --- Encode JPEG at the requested quality. The new bitmap carries no
  #     EXIF, so the rotation above is permanent and can't double-apply. ---
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)

  $destDir = Split-Path -Parent $Dest
  if ($destDir -and -not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
  $destFull = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Dest))

  $bmp.Save($destFull, $encoder, $params)
  $bmp.Dispose()

  $kb = [Math]::Round((Get-Item -LiteralPath $destFull).Length / 1KB)
  "OK  {0,-38} {1}x{2}  {3} KB" -f (Split-Path -Leaf $destFull), $w, $h, $kb
}
finally {
  $img.Dispose()
}
