document.addEventListener('DOMContentLoaded',async()=>{
 const root=document.getElementById('publication-statistics');if(!root)return;
 const load=async(url)=>{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(url);return r.json()};
 try{
 const [all,metricRows]=await Promise.all([load('/publications.json'),load('/publication_metrics.json')]);
 const journals=all.filter(x=>x.category==='International Journal');
 const pubs=journals.filter(x=>x.status==='Published');
 const revisions=journals.filter(x=>x.status==='In revision');
 const submitted=journals.filter(x=>x.status==='Submitted');
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const titleSet=new Set(pubs.map(x=>norm(x.title)));
 const metrics=metricRows.filter(x=>titleSet.has(norm(x.title)));
 const ifs=metrics.map(x=>x.if).filter(x=>Number.isFinite(x));
 const top=metrics.filter(x=>Number.isFinite(x.top_percent)&&x.top_percent<=10).length;
 const jcrPubs=pubs.filter(x=>x.jcr_year===2025 && ['Q1','Q2','Q3','Q4'].includes(x.jcr_quartile));
 const quartiles=Object.fromEntries(['Q1','Q2','Q3','Q4'].map(q=>[q,jcrPubs.filter(x=>x.jcr_quartile===q).length]));
 const jifs=jcrPubs.map(x=>x.jcr_jif).filter(x=>Number.isFinite(x));
 const top10=jcrPubs.filter(x=>(Number.isFinite(x.jcr_best_top_percent)&&x.jcr_best_top_percent<=10)||(x.top_percentile_as_listed_on_original==='Top 10%')).length;
 const set=(id,value)=>{const e=document.getElementById(id);if(e)e.textContent=value};
 set('impact-total-records',all.length);
 set('impact-published',pubs.length);
 // WDSLab's confirmed local reporting rule: every published article with a recorded IF is SCIE.
 // Count only distinct published journal articles with an IF; do not count submitted/revision records.
 const scie=pubs.filter(x=>Number.isFinite(x.jcr_jif)||metrics.some(m=>norm(m.title)===norm(x.title)&&Number.isFinite(m.if)));
 set('impact-scie',scie.length);
 set('pipeline-published',pubs.length);
 set('pipeline-revision',revisions.length);
 set('pipeline-submitted',submitted.length);
 set('pipeline-total',pubs.length+revisions.length+submitted.length);
 const track=document.getElementById('pipeline-track');
 if(track){track.replaceChildren();
 const total=Math.max(1,pubs.length+revisions.length+submitted.length);
 [['published',pubs.length],['revision',revisions.length],['submitted',submitted.length]].forEach(([type,n])=>{
 const segment=document.createElement('span');segment.className='pipeline-segment '+type;segment.style.width=(100*n/total)+'%';segment.title=type+': '+n;track.append(segment);
 });}
 const activity=document.getElementById('impact-activity-chart');
 if(activity){activity.replaceChildren();const years={};
 journals.filter(x=>['Published','In revision','Submitted'].includes(x.status)).forEach(x=>{
 const y=String(x.year);if(!years[y])years[y]={Published:0,'In revision':0,Submitted:0};years[y][x.status]++;
 });
 const rows=Object.entries(years).sort((a,b)=>Number(a[0])-Number(b[0]));
 const max=Math.max(1,...rows.map(([,v])=>v.Published+v['In revision']+v.Submitted));
 rows.forEach(([year,values])=>{
 const row=document.createElement('div');row.className='impact-activity-row';
 const label=document.createElement('span');label.className='impact-activity-year';label.textContent=year;
 const bar=document.createElement('div');bar.className='impact-activity-bar';
 for(const [status,cls] of [['Published','published'],['In revision','revision'],['Submitted','submitted']]){
 const n=values[status];if(!n)continue;const seg=document.createElement('span');seg.className='pipeline-segment '+cls;
 seg.style.width=(100*n/max)+'%';seg.title=status+': '+n;bar.append(seg);
 }
 const count=document.createElement('b');count.textContent=values.Published+values['In revision']+values.Submitted;
 row.append(label,bar,count);activity.append(row);
 });}
 
 set('impact-mean',jifs.length?(jifs.reduce((a,b)=>a+b,0)/jifs.length).toFixed(2):'—');
 set('impact-q1',quartiles.Q1);
 set('impact-top',top10);
 ['Q1','Q2','Q3','Q4'].forEach(q=>set('impact-'+q.toLowerCase()+'-count',quartiles[q]));
 const years={};pubs.forEach(x=>{const k=String(x.year);years[k]=(years[k]||0)+1});
 const yearEntries=Object.entries(years).sort((a,b)=>Number(a[0])-Number(b[0]));
 const yearEl=document.getElementById('impact-year-chart');yearEl.replaceChildren();
 const maxYear=Math.max(1,...yearEntries.map(x=>x[1]));
 yearEntries.forEach(([year,n])=>{const col=document.createElement('div');col.className='impact-year-col';col.title=`${year}: ${n} articles`;const val=document.createElement('b');val.textContent=n;const track=document.createElement('div');track.className='impact-year-track';const bar=document.createElement('span');bar.className='impact-year-fill';bar.style.height=(100*n/maxYear)+'%';track.append(val,bar);const label=document.createElement('small');label.textContent=year;col.append(track,label);yearEl.append(col)});
 const fields={};pubs.forEach(x=>{const k=x.research_area||'Unclassified';fields[k]=(fields[k]||0)+1});
 const area=document.getElementById('impact-area-chart');area.replaceChildren();const entries=Object.entries(fields).sort((a,b)=>b[1]-a[1]);const maxField=Math.max(1,...entries.map(x=>x[1]));
 entries.forEach(([label,n])=>{const row=document.createElement('div');row.className='impact-area-row';const header=document.createElement('div');const l=document.createElement('span');l.textContent=label;const v=document.createElement('b');v.textContent=n;header.append(l,v);const tr=document.createElement('div');tr.className='impact-area-track';const fill=document.createElement('span');fill.className='impact-area-fill';fill.style.width=(100*n/maxField)+'%';tr.append(fill);row.append(header,tr);area.append(row)});

 // 그래프에 마우스를 올리면(휴대폰은 누르면) 그 칸에 들어간 논문 목록이 작은 상자로 뜸 — 연도별 · 연구 분야별 · 원고 현황
 const tip=document.createElement('div');tip.className='chart-tip';tip.setAttribute('aria-hidden','true');document.body.append(tip);
 const tips=new Map();
 const describe=(el,head,list)=>{if(!el)return;tips.set(el,{head,list});el.removeAttribute('title');el.classList.add('has-tip');};
 [...yearEl.children].forEach(col=>{const y=col.querySelector('small').textContent;const list=pubs.filter(x=>String(x.year)===y);describe(col,`${y} · ${list.length} journal papers`,list);});
 [...area.children].forEach(row=>{const name=row.querySelector('span').textContent;const list=pubs.filter(x=>(x.research_area||'Unclassified')===name);describe(row,`${name} · ${list.length} papers`,list);});
 if(track)[['published','Published',pubs],['revision','In revision',revisions],['submitted','Submitted',submitted]].forEach(([cls,name,list])=>describe(track.querySelector('.'+cls),`${name} · ${list.length}`,list));
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let current=null;
// 상자는 처음 나타난 자리에 그대로 있다(마우스를 따라다니지 않음) — 그래야 마우스를 상자 위로 옮겨 그 안에서 스크롤할 수 있다 (사용자 요청 10-23).
// 마우스가 칸·상자 둘 다에서 벗어나면 바로 사라진다(늦춤 없음 — 사용자 요청). 단 그래프 칸에서 상자로 옮기는 사이 빈 틈(상자 가장자리 14px 안)은 봐준다. 다른 칸에 올리면 내용·자리가 바뀜
const place=(x,y)=>{const w=tip.offsetWidth,h=tip.offsetHeight;let left=x+12,top=y+12;if(left+w>innerWidth-8)left=x-w-12;if(top+h>innerHeight-8)top=y-h-12;tip.style.left=Math.max(8,left)+'px';tip.style.top=Math.max(8,top)+'px';};
const show=(el,x,y)=>{if(el===current)return;const d=tips.get(el);current=el;tip.innerHTML=`<b>${esc(d.head)}</b><ul>${d.list.map(p=>`<li>${esc(p.title)}<span>${esc(p.venue)}${p.year?' · '+esc(p.year):''}</span></li>`).join('')}</ul>`;const ul=tip.querySelector('ul');if(ul)ul.scrollTop=0;place(x,y);tip.classList.add('is-on');};   // 전부 넣고(상자 크기는 CSS 로 고정) 넘치면 목록 안에서 스크롤
const hide=()=>{tip.classList.remove('is-on');current=null;};
const nearTip=(x,y)=>{const r=tip.getBoundingClientRect();return x>=r.left-14&&x<=r.right+14&&y>=r.top-14&&y<=r.bottom+14;};
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;if(tip.contains(e.target))return;const el=e.target.closest('.has-tip');if(el&&tips.has(el))show(el,e.clientX,e.clientY);else if(current&&!nearTip(e.clientX,e.clientY))hide();});
document.documentElement.addEventListener('mouseleave',hide);   // 창 밖으로 나가도 바로
document.addEventListener('click',e=>{if(tip.contains(e.target))return;const el=e.target.closest('.has-tip');if(el&&tips.has(el)){current=null;show(el,e.clientX,e.clientY);}else hide();});
addEventListener('scroll',hide,{passive:true});
 }catch(e){console.error('Publication statistics could not load',e);}
});