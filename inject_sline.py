import os, re

BASE = r'C:\Users\sriva\Downloads\Website 2026'

JS = r"""<script>
(function(){const s=document.createElement('div');s.className='sline-stage';const c=document.createElement('canvas');c.id='slineCanvas';s.appendChild(c);document.querySelector('.navbar').insertAdjacentElement('afterend',s);const ctx=c.getContext('2d');let W=window.innerWidth;c.width=W;c.height=60;window.addEventListener('resize',()=>{W=window.innerWidth;c.width=W;});let id,start;const amp=5,lw=1,op=0.22,gs=2,dur=2200,rop=0.15;function frame(ts){if(!start)start=ts;const el=ts-start,p=Math.min(1,el/dur),tx=W*p;const act=p<0.15?p/0.15*0.3:p<0.5?0.3+(p-0.15)/0.35*0.7:p<0.75?1-(p-0.5)/0.25*0.85:Math.max(0,0.15-(p-0.75)/0.25*0.15);ctx.clearRect(0,0,W,60);const draw=(lw2,op2,shadow)=>{if(shadow){ctx.save();ctx.shadowColor='rgba(255,255,255,0.3)';ctx.shadowBlur=gs*act*4;}ctx.beginPath();ctx.strokeStyle=`rgba(255,255,255,${op2})`;ctx.lineWidth=lw2;ctx.lineCap='round';const st=Math.max(2,Math.floor(tx/2));for(let i=0;i<=st;i++){const x=(i/st)*tx,y=8+amp*act*(Math.sin(x*.07)*.5+Math.sin(x*.19+1.2)*.3+Math.sin(x*.37+2.5)*.2);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();if(shadow)ctx.restore();};if(act>0.1)draw(lw*2.5,op*act*0.5,true);draw(lw,op*(0.4+act*0.6),false);if(p<0.98){const tx2=tx,ty=8+amp*act*(Math.sin(tx2*.07)*.5+Math.sin(tx2*.19+1.2)*.3+Math.sin(tx2*.37+2.5)*.2);ctx.save();ctx.shadowColor='rgba(255,255,255,0.8)';ctx.shadowBlur=gs*3;ctx.beginPath();ctx.arc(tx2,ty,gs*.8,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.restore();id=requestAnimationFrame(frame);}else{ctx.clearRect(0,0,W,60);ctx.beginPath();ctx.strokeStyle=`rgba(255,255,255,${rop})`;ctx.lineWidth=1;ctx.moveTo(0,8);ctx.lineTo(W,8);ctx.stroke();}}requestAnimationFrame(frame);})();
</script>"""

def css(top):
    return (
        f'.sline-stage{{position:fixed;top:{top}px;left:0;width:100%;height:60px;z-index:199;pointer-events:none;}}\n'
        f'#slineCanvas{{position:absolute;top:0;left:0;}}\n'
    )

done, skipped = 0, 0

for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d != '.backup']
    for fname in files:
        if not fname.endswith('.html'):
            continue
        path = os.path.join(root, fname)
        rel  = os.path.relpath(path, BASE)

        # Determine navbar height
        top = 92 if rel.startswith('Work' + os.sep) else 120

        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        # Skip if already injected
        if 'sline-stage' in content:
            print(f'  SKIP (already has sline): {rel}')
            skipped += 1
            continue

        snippet = css(top)

        # Insert CSS after first opening <style> tag
        new_content = re.sub(
            r'(<style\b[^>]*>)',
            lambda m: m.group(1) + '\n' + snippet,
            content, count=1
        )

        # Insert JS before </body>
        new_content = new_content.replace('</body>', JS + '\n</body>', 1)

        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f'  OK  top:{top}px  {rel}')
        done += 1

print(f'\n{done} files updated, {skipped} skipped.')
