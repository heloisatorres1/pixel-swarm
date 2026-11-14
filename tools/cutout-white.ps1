<#
  Cuts sprites out of a sheet drawn on a WHITE background.
  For each piece: crop the rectangle, flood-fill the near-white background from the crop edges
  (so whites inside the art — eyes, shines — are kept), soften the edge, trim, save as PNG.
  Usage:
    .\tools\cutout-white.ps1 -Sheet sheet.png -Out assets\story\nectar -Pieces @{ bee='560,30,285,250' }
  Use -Opaque for pieces that are a plain rectangle (only crops, no cutout).
#>
param(
  [Parameter(Mandatory)] [string]$Sheet,
  [Parameter(Mandatory)] [string]$Out,
  [Parameter(Mandatory)] [hashtable]$Pieces,
  [int]$Threshold = 232,
  [string[]]$Opaque = @(),
  [string[]]$Largest = @()   # pieces where only the biggest connected shape is kept
)
Add-Type -AssemblyName System.Drawing
if (-not ('WhiteCut' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class WhiteCut {
  // keep only the biggest connected shape (drops bits of neighbouring sprites that overlap the crop)
  static void KeepLargest(bool[] bg, int w, int h) {
    var lab = new int[w * h]; int best = 0, bestN = 0, id = 0; var q = new Queue<int>();
    for (int s = 0; s < w * h; s++) {
      if (bg[s] || lab[s] != 0) continue; id++; int n = 0; lab[s] = id; q.Enqueue(s);
      while (q.Count > 0) { int p = q.Dequeue(); n++; int x = p % w, y = p / w;
        foreach (int nb in new[] { x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1 })
          if (nb >= 0 && !bg[nb] && lab[nb] == 0) { lab[nb] = id; q.Enqueue(nb); } }
      if (n > bestN) { bestN = n; best = id; }
    }
    for (int p = 0; p < w * h; p++) if (!bg[p] && lab[p] != best) bg[p] = true;
  }
  public static Bitmap Cut(Bitmap src, Rectangle r, int thr, bool opaque, bool largest) {
    var bmp = src.Clone(r, PixelFormat.Format32bppArgb);
    if (opaque) return bmp;
    int w = bmp.Width, h = bmp.Height;
    var d = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var px = new byte[w * h * 4]; Marshal.Copy(d.Scan0, px, 0, px.Length);
    Func<int, bool> white = i => px[i] >= thr && px[i + 1] >= thr && px[i + 2] >= thr;
    var bg = new bool[w * h]; var q = new Queue<int>();
    for (int x = 0; x < w; x++) { q.Enqueue(x); q.Enqueue((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { q.Enqueue(y * w); q.Enqueue(y * w + w - 1); }
    while (q.Count > 0) {
      int p = q.Dequeue(); if (bg[p] || !white(p * 4)) continue; bg[p] = true;
      int x = p % w, y = p / w;
      if (x > 0) q.Enqueue(p - 1); if (x < w - 1) q.Enqueue(p + 1);
      if (y > 0) q.Enqueue(p - w); if (y < h - 1) q.Enqueue(p + w);
    }
    if (largest) KeepLargest(bg, w, h);
    int minX = w, minY = h, maxX = -1, maxY = -1;
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      int p = y * w + x;
      if (bg[p]) { px[p * 4 + 3] = 0; continue; }
      // soft edge: pixels touching the background get alpha from how white they are
      bool edge = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w]);
      if (edge) { int m = Math.Min(px[p * 4], Math.Min(px[p * 4 + 1], px[p * 4 + 2])); px[p * 4 + 3] = (byte)Math.Max(60, Math.Min(255, (255 - m) * 4)); }
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    Marshal.Copy(px, 0, d.Scan0, px.Length); bmp.UnlockBits(d);
    if (maxX < 0) return bmp;
    var t = bmp.Clone(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1), PixelFormat.Format32bppArgb);
    bmp.Dispose(); return t;
  }
}
'@
}
$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Sheet))
New-Item -ItemType Directory -Force $Out | Out-Null
foreach ($k in $Pieces.Keys) {
  $v = $Pieces[$k] -split ',' | ForEach-Object { [int]$_ }
  $bmp = [WhiteCut]::Cut($src, (New-Object System.Drawing.Rectangle $v[0], $v[1], $v[2], $v[3]), $Threshold, ($Opaque -contains $k), ($Largest -contains $k))
  $bmp.Save((Join-Path (Resolve-Path $Out) "$k.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  "$k  $($bmp.Width)x$($bmp.Height)"
  $bmp.Dispose()
}
$src.Dispose()
