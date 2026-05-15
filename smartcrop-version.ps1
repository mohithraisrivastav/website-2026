$oldPrefix = "var PREFIX = 'fp_';"
$newPrefix = "var PREFIX = 'fp2_';"   # <-- bump this number each time (fp2, fp3, fp4...)

$files = Get-ChildItem -Path 'C:\Users\sriva\Downloads\Website 2026\Work' -Filter '*.html'

foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw -Encoding UTF8
  if ($c.Contains($oldPrefix)) {
    $c = $c.Replace($oldPrefix, $newPrefix)
    Set-Content -Path $f.FullName -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Bumped: $($f.Name)"
  }
}

Write-Host ""
Write-Host "Done. Old cache keys (fp_...) are now ignored."
Write-Host "Smartcrop will recompute all images on next page load."
