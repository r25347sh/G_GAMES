(function (global) {
  "use strict";
  function World() {
    this.clouds = []; this.nebulae = []; this.aurora = []; this.stars = [];
    var C = global.WWNConfig;
    var tints = [[255,45,149],[0,245,255],[155,93,229],[255,180,60],[80,200,120],[100,140,255]];
    // Fewer, precomputed details avoid building hundreds of gradients and random stars every frame.
    for (var i = 0; i < 22; i++) this.clouds.push({ x:(Math.random()-.5)*C.WORLD_SIZE, y:(Math.random()-.5)*C.WORLD_SIZE, r:55+Math.random()*105, layer:i%3, tint:i%4, a:.035+Math.random()*.045 });
    for (var n = 0; n < 6; n++) this.nebulae.push({ x:(Math.random()-.5)*C.WORLD_SIZE*.85, y:(Math.random()-.5)*C.WORLD_SIZE*.85, r:240+Math.random()*250, col:tints[n%tints.length], a:.035+Math.random()*.025 });
    for (var a = 0; a < 2; a++) this.aurora.push({ y:(Math.random()-.5)*C.WORLD_SIZE*.6, phase:Math.random()*6.28, speed:.18+Math.random()*.2, amp:35+Math.random()*35, col:tints[a] });
    for (var s = 0; s < 340; s++) this.stars.push({ x:(Math.random()-.5)*C.WORLD_SIZE, y:(Math.random()-.5)*C.WORLD_SIZE, r:.5+Math.random()*1.1, a:.16+Math.random()*.42, phase:Math.random()*6.28 });
    this._t = 0;
  }
  function biomeAt(x,y) { var n=Math.sin(x*.00035)*Math.cos(y*.00035); if(n>.35)return {bg:"#0a0520",accent:[255,45,149]}; if(n<-.35)return {bg:"#041218",accent:[0,245,255]}; if(x*y>0)return {bg:"#08061a",accent:[155,93,229]}; return {bg:"#0c0a12",accent:[255,180,60]}; }
  World.prototype.draw = function (ctx, cam) {
    var C=global.WWNConfig, half=C.WORLD_SIZE/2, w=cam.w, h=cam.h; this._t += .016;
    var bio=biomeAt(cam.x,cam.y); ctx.fillStyle=bio.bg; ctx.fillRect(0,0,w,h);
    ctx.fillStyle="rgba("+bio.accent.join(",")+",.035)"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle="rgba(255,255,255,.12)";
    for(var i=0;i<this.stars.length;i++){var st=this.stars[i],x=st.x-cam.x*.22+w/2,y=st.y-cam.y*.22+h/2;if(x>=0&&x<w&&y>=0&&y<h){ctx.globalAlpha=st.a*(.78+.22*Math.sin(this._t+st.phase));ctx.fillRect(x,y,st.r,st.r);}}
    ctx.globalAlpha=1;
    for(var n=0;n<this.nebulae.length;n++){var neb=this.nebulae[n],nx=neb.x-cam.x*.4+w/2,ny=neb.y-cam.y*.4+h/2;if(nx < -neb.r||nx>w+neb.r||ny < -neb.r||ny>h+neb.r)continue;ctx.fillStyle="rgba("+neb.col.join(",")+","+neb.a+")";ctx.beginPath();ctx.arc(nx,ny,neb.r,0,Math.PI*2);ctx.fill();}
    for(var a=0;a<this.aurora.length;a++){var au=this.aurora[a],ay=au.y-cam.y*.3+h/2;if(ay < -60||ay>h+60)continue;ctx.beginPath();ctx.moveTo(0,ay);for(var px=0;px<=w;px+=48)ctx.lineTo(px,ay+Math.sin(px*.009+this._t*au.speed+au.phase)*au.amp);ctx.strokeStyle="rgba("+au.col.join(",")+",.08)";ctx.lineWidth=9;ctx.stroke();}
    var cols=["180,200,255","255,180,220","160,255,240","255,220,160"];
    for(var c=0;c<this.clouds.length;c++){var cl=this.clouds[c],par=.25+cl.layer*.25,cx=cl.x-cam.x*par+w/2,cy=cl.y-cam.y*par+h/2;if(cx < -cl.r||cx>w+cl.r||cy < -cl.r||cy>h+cl.r)continue;ctx.fillStyle="rgba("+cols[cl.tint]+","+cl.a+")";ctx.beginPath();ctx.arc(cx,cy,cl.r,0,Math.PI*2);ctx.fill();}
    var bx=-half-cam.x+w/2,by=-half-cam.y+h/2;ctx.strokeStyle="rgba(255,45,149,.35)";ctx.lineWidth=2;ctx.strokeRect(bx,by,C.WORLD_SIZE,C.WORLD_SIZE);ctx.strokeStyle="rgba(255,215,0,.13)";ctx.lineWidth=1;ctx.strokeRect(bx+C.BORDER_WARN,by+C.BORDER_WARN,C.WORLD_SIZE-C.BORDER_WARN*2,C.WORLD_SIZE-C.BORDER_WARN*2);
  };
  global.WWNWorld = World;
})(typeof window !== "undefined" ? window : globalThis);
