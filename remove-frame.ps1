$file = 'C:\Users\sriva\Downloads\Website 2026\Work\casa-kosha.html'
$c = Get-Content $file -Raw -Encoding UTF8

# 1. Remove the frame 19 div entirely
$c = $c -replace '(?s)\s*<div class="p" data-index="19".*?</div>\s*</div>', ''

# 2. Renumber frames 20-30 down to 19-29
#    Go backwards to avoid double-replacement (30→29 first, then 29→28, etc.)
for ($n = 30; $n -ge 20; $n--) {
    $old = $n
    $new = $n - 1
    $oldPad = '{0:D2}' -f $old
    $newPad = '{0:D2}' -f $new

    # data-index="XX" and data-num="XX" and data-label and p-index-label
    $c = $c -replace "data-index=""$oldPad""", "data-index=""$newPad"""
    $c = $c -replace "data-num=""$old""",      "data-num=""$new"""
    $c = $c -replace "data-label=""Frame $old""", "data-label=""Frame $new"""
    $c = $c -replace "<span class=""p-index-label"">$oldPad</span>", "<span class=""p-index-label"">$newPad</span>"
}

# 3. Update total frame count from 30 to 29
$c = $c -replace 'fc-total[^>]*>[^<]*30', { $_.Value -replace '30', '29' }
$c = $c -replace '"fc-total"[^>]*>[^<]*', { $_.Value -replace '(?<=>)\s*30\s*$', '29' }
# Simpler approach for fc-total
$c = $c -replace '(<[^>]*id="fc-total"[^>]*>)\s*30\s*(<)', '${1}29${2}'
$c = $c -replace 'data-total="30"', 'data-total="29"'

Set-Content -Path $file -Value $c -Encoding UTF8 -NoNewline
Write-Host "Done. Frame 19 removed, frames renumbered to 29 total."
