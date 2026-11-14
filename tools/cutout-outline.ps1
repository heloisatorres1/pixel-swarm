# Cuts a character out of a busy background when the character has a continuous colored outline.
# Everything reachable from the crop border without crossing "outline-colored" pixels becomes transparent.
# Usage: .\cutout-outline.ps1 -Src img.png -Out out.png -X 300 -Y 170 -W 850 -H 720 -HueMin 255 -HueMax 330
# HueMin > HueMax wraps around red (e.g. -HueMin 340 -HueMax 25). -ValMax: very dark pixels also count as outline.
param([string]$Src, [string]$Out, [int]$X, [int]$Y, [int]$W, [int]$H,
      [double]$HueMin = 255, [double]$HueMax = 330, [double]$SatMin = 0.25, [int]$OutWidth = 360, [double]$ValMax = -1)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging;
public static class Cutout {
  public static void Run(string src, string outPath, int X, int Y, int W, int H, double hMin, double hMax, double sMin, int outW, double vMax) {
    var full = new Bitmap(src);
    var bmp = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(bmp)) g.DrawImage(full, new Rectangle(0,0,W,H), new Rectangle(X,Y,W,H), GraphicsUnit.Pixel);
    full.Dispose();
    var d = bmp.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var px = new byte[d.Stride*H]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0, px, 0, px.Length); int S = d.Stride;
    var barrier = new bool[W*H];
    for (int y=0;y<H;y++) for (int x=0;x<W;x++) {
      int o=y*S+x*4; double b=px[o]/255.0, gg=px[o+1]/255.0, r=px[o+2]/255.0;
      double mx=Math.Max(r,Math.Max(gg,b)), mn=Math.Min(r,Math.Min(gg,b)), c=mx-mn, hue=0;
      if (c>0) { if (mx==r) hue=60*(((gg-b)/c)%6); else if (mx==gg) hue=60*((b-r)/c+2); else hue=60*((r-gg)/c+4); }
      if (hue<0) hue+=360; double sat = mx==0?0:c/mx;
      bool inHue = hMin <= hMax ? (hue>=hMin && hue<=hMax) : (hue>=hMin || hue<=hMax);
      barrier[y*W+x] = (inHue && sat>=sMin) || (vMax > 0 && mx <= vMax);
    }
    var bg = new bool[W*H]; var q = new Queue<int>();
    for (int x=0;x<W;x++){ q.Enqueue(x); q.Enqueue((H-1)*W+x); }
    for (int y=0;y<H;y++){ q.Enqueue(y*W); q.Enqueue(y*W+W-1); }
    while (q.Count>0) { int p=q.Dequeue(); if (bg[p]||barrier[p]) continue; bg[p]=true; int x=p%W, y=p/W;
      if (x>0) q.Enqueue(p-1); if (x<W-1) q.Enqueue(p+1); if (y>0) q.Enqueue(p-W); if (y<H-1) q.Enqueue(p+W); }
    // erode 1px so no background fringe remains, then soften the edge
    var keep = new bool[W*H];
    for (int y=1;y<H-1;y++) for (int x=1;x<W-1;x++) { int p=y*W+x;
      keep[p] = !bg[p] && !bg[p-1] && !bg[p+1] && !bg[p-W] && !bg[p+W]; }
    // keep only the largest connected shape (the character); drops stray background bits
    var lab = new int[W*H]; int best=0, bestN=0, next=0; var st = new Stack<int>();
    for (int p0=0;p0<W*H;p0++) { if (!keep[p0] || lab[p0]!=0) continue; next++; int n=0; lab[p0]=next; st.Push(p0);
      while (st.Count>0) { int p=st.Pop(); n++; int x=p%W, y=p/W;
        int[] nb = { x>0?p-1:-1, x<W-1?p+1:-1, y>0?p-W:-1, y<H-1?p+W:-1 };
        foreach (int q2 in nb) if (q2>=0 && keep[q2] && lab[q2]==0) { lab[q2]=next; st.Push(q2); } }
      if (n>bestN) { bestN=n; best=next; } }
    for (int p=0;p<W*H;p++) if (keep[p] && lab[p]!=best) keep[p]=false;
    int x0=W,y0=H,x1=0,y1=0;
    for (int y=0;y<H;y++) for (int x=0;x<W;x++) { int p=y*W+x, o=y*S+x*4;
      if (!keep[p]) { px[o+3]=0; continue; }
      bool edge = !keep[p-1] || !keep[p+1] || !keep[p-W] || !keep[p+W];
      px[o+3] = (byte)(edge ? 150 : 255);
      if (x<x0)x0=x; if (x>x1)x1=x; if (y<y0)y0=y; if (y>y1)y1=y; }
    System.Runtime.InteropServices.Marshal.Copy(px, 0, d.Scan0, px.Length); bmp.UnlockBits(d);
    int cw=x1-x0+9, ch=y1-y0+9; int ow=outW, oh=(int)Math.Round(ch*(double)ow/cw);
    var outB = new Bitmap(ow, oh, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(outB)) { g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      g.DrawImage(bmp, new Rectangle(0,0,ow,oh), new Rectangle(x0-4,y0-4,cw,ch), GraphicsUnit.Pixel); }
    outB.Save(outPath, ImageFormat.Png); outB.Dispose(); bmp.Dispose();
  }
}
"@
[Cutout]::Run((Resolve-Path $Src).Path, $Out, $X, $Y, $W, $H, $HueMin, $HueMax, $SatMin, $OutWidth, $ValMax)
"saved $Out"
