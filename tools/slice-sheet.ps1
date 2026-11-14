# Slices an AI-generated sprite sheet (white background, 8x7 grid) into transparent PNGs.
# Usage: .\slice-sheet.ps1 -Sheet path\sheet1.png -OutDir assets\sprites
param([string]$Sheet, [string]$OutDir, [int]$Cols = 8, [int]$Rows = 7, [string[]]$Names)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging;
public static class Slicer {
  public static string Run(string path, string outDir, int cols, int rows, string[] names) {
    var src = new Bitmap(path);
    int W = src.Width, H = src.Height;
    var bmp = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(bmp)) g.DrawImage(src, 0, 0, W, H);
    src.Dispose();
    var d = bmp.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var px = new byte[d.Stride * H];
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0, px, 0, px.Length);
    int S = d.Stride;
    Func<int,int,int> minc = (x,y) => { int o=y*S+x*4; return Math.Min(px[o], Math.Min(px[o+1], px[o+2])); };
    // 1) flood-fill near-white background from the borders
    var bg = new bool[W*H];
    var q = new Queue<int>();
    for (int x=0;x<W;x++){ q.Enqueue(x); q.Enqueue((H-1)*W+x); }
    for (int y=0;y<H;y++){ q.Enqueue(y*W); q.Enqueue(y*W+W-1); }
    while (q.Count>0) {
      int p=q.Dequeue(); if (bg[p]) continue;
      int x=p%W, y=p/W; if (minc(x,y) < 222) continue;
      bg[p]=true;
      if (x>0) q.Enqueue(p-1); if (x<W-1) q.Enqueue(p+1); if (y>0) q.Enqueue(p-W); if (y<H-1) q.Enqueue(p+W);
    }
    // 2) distance (in px, up to 3) from background, for edge color-to-alpha
    var dist = new int[W*H];
    for (int i=0;i<W*H;i++) dist[i] = bg[i] ? 0 : 99;
    for (int pass=1; pass<=3; pass++)
      for (int y=1;y<H-1;y++) for (int x=1;x<W-1;x++) { int p=y*W+x;
        if (dist[p]==99 && (dist[p-1]==pass-1||dist[p+1]==pass-1||dist[p-W]==pass-1||dist[p+W]==pass-1)) dist[p]=pass; }
    for (int y=0;y<H;y++) for (int x=0;x<W;x++) {
      int p=y*W+x, o=y*S+x*4;
      if (bg[p]) { px[o+3]=0; continue; }
      if (dist[p] <= 2) { // un-blend white fringe
        double b=px[o]/255.0, gg=px[o+1]/255.0, r=px[o+2]/255.0;
        double a = Math.Max(1-r, Math.Max(1-gg, 1-b)); a = Math.Min(1, a*1.6);
        if (a < 0.02) { px[o+3]=0; continue; }
        Func<double,byte> un = c => (byte)Math.Max(0, Math.Min(255, Math.Round(((c - (1-a)) / a) * 255)));
        px[o]=un(b); px[o+1]=un(gg); px[o+2]=un(r); px[o+3]=(byte)Math.Round(a*255);
      }
    }
    // 3) connected components of opaque pixels -> assign to grid cell by centroid
    var lab = new int[W*H]; int next=0;
    var minX=new List<int>(); var minY=new List<int>(); var maxX=new List<int>(); var maxY=new List<int>();
    var cnt=new List<int>(); var sx=new List<long>(); var sy=new List<long>();
    var st = new Stack<int>();
    for (int p0=0;p0<W*H;p0++) {
      if (lab[p0]!=0 || px[(p0/W)*S+(p0%W)*4+3] < 20) continue;
      next++; lab[p0]=next; st.Push(p0);
      int a0=W,b0=H,a1=0,b1=0,c=0; long tx=0,ty=0;
      while (st.Count>0) { int p=st.Pop(); int x=p%W, y=p/W; c++; tx+=x; ty+=y;
        if (x<a0)a0=x; if (x>a1)a1=x; if (y<b0)b0=y; if (y>b1)b1=y;
        for (int k=0;k<4;k++){ int nx=x+(k==0?1:k==1?-1:0), ny=y+(k==2?1:k==3?-1:0);
          if (nx<0||ny<0||nx>=W||ny>=H) continue; int np=ny*W+nx;
          if (lab[np]==0 && px[ny*S+nx*4+3]>=20){ lab[np]=next; st.Push(np);} } }
      minX.Add(a0); minY.Add(b0); maxX.Add(a1); maxY.Add(b1); cnt.Add(c); sx.Add(tx); sy.Add(ty);
    }
    double cw = W/(double)cols, ch = H/(double)rows;
    var cx0=new int[cols*rows]; var cy0=new int[cols*rows]; var cx1=new int[cols*rows]; var cy1=new int[cols*rows]; var has=new bool[cols*rows];
    var cellOf = new int[next+1];
    for (int i=0;i<next;i++) {
      cellOf[i+1] = -1;
      if (cnt[i] < 40) continue; // specks
      int col=(int)((sx[i]/(double)cnt[i])/cw), row=(int)((sy[i]/(double)cnt[i])/ch);
      col=Math.Min(cols-1,col); row=Math.Min(rows-1,row); int cell=row*cols+col; cellOf[i+1]=cell;
      if (!has[cell]) { cx0[cell]=minX[i]; cy0[cell]=minY[i]; cx1[cell]=maxX[i]; cy1[cell]=maxY[i]; has[cell]=true; }
      else { cx0[cell]=Math.Min(cx0[cell],minX[i]); cy0[cell]=Math.Min(cy0[cell],minY[i]); cx1[cell]=Math.Max(cx1[cell],maxX[i]); cy1[cell]=Math.Max(cy1[cell],maxY[i]); }
    }
    System.Runtime.InteropServices.Marshal.Copy(px, 0, d.Scan0, px.Length);
    bmp.UnlockBits(d);
    var report = new System.Text.StringBuilder();
    for (int cell=0; cell<cols*rows; cell++) {
      string name = cell < names.Length ? names[cell] : ("item" + (cell+1));
      if (!has[cell]) { report.AppendLine("MISSING " + name); continue; }
      int pad=4, x0=Math.Max(0,cx0[cell]-pad), y0=Math.Max(0,cy0[cell]-pad), x1=Math.Min(W-1,cx1[cell]+pad), y1=Math.Min(H-1,cy1[cell]+pad);
      var outB = new Bitmap(x1-x0+1, y1-y0+1, PixelFormat.Format32bppArgb);
      // copy only pixels that belong to this cell's components
      for (int y=y0;y<=y1;y++) for (int x=x0;x<=x1;x++) {
        int l = lab[y*W+x];
        if (l!=0 && cellOf[l]==cell) outB.SetPixel(x-x0, y-y0, bmp.GetPixel(x,y));
      }
      outB.Save(System.IO.Path.Combine(outDir, name + ".png"), ImageFormat.Png); outB.Dispose();
      report.AppendLine(name + " " + (x1-x0+1) + "x" + (y1-y0+1));
    }
    bmp.Dispose();
    return "sheet " + W + "x" + H + "\n" + report.ToString();
  }
}
"@
$defaultNames = @(
 'bee','ladybug','beetle','butterfly','ant','firefly','bee_fly','ladybug_fly',
 'coin','gem','coins_pile','gems_pile','chest','gift','star','trophy',
 'icon_settings','icon_collections','icon_activities','icon_noads','icon_events','icon_store','icon_home','icon_skins',
 'icon_music','icon_sfx','icon_haptics','icon_notifications','icon_privacy','icon_terms','icon_feedback','icon_lock',
 'btn_green','btn_blue','btn_yellow','btn_round_wood','btn_close','btn_plus','banner_wood','panel_wood',
 'slot_empty','block_red','block_mystery','block_ice','block_wood','key','hammer','icon_video_ad',
 'booster_shuffle','booster_turret','booster_wing','booster_pick','booster_add_slot','icon_speed','blocker_cookie','pipe'
)
$names = if ($Names) { $Names } else { $defaultNames }
New-Item -ItemType Directory -Force $OutDir | Out-Null
[Slicer]::Run((Resolve-Path $Sheet).Path, (Resolve-Path $OutDir).Path, $Cols, $Rows, $names)
