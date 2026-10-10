document.addEventListener('DOMContentLoaded',async()=>{
 const root=document.getElementById('publication-statistics');if(!root)return;
 const load=async(url)=>{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(url);return r.json()};
 try{
 const [all,metricRows]=await Promise.all([load('publications.json'),load('publication_metrics.json')]);
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
 yearEntries.forEach(([year,n])=>{const col=document.createElement('div');col.className='impact-year-col';col.title=`${year}: ${n} articles`;const val=document.createElement('b');val.textContent=n;const track=document.createElement('div');track.className='impact-year-track';const bar=document.createElement('span');bar.className='impact-year-fill';bar.style.height=(100*n/maxYear)+'%';track.append(bar);const label=document.createElement('small');label.textContent=year;col.append(val,track,label);yearEl.append(col)});
 const fields={};pubs.forEach(x=>{const k=x.research_area||'Unclassified';fields[k]=(fields[k]||0)+1});
 const area=document.getElementById('impact-area-chart');area.replaceChildren();const entries=Object.entries(fields).sort((a,b)=>b[1]-a[1]);const maxField=Math.max(1,...entries.map(x=>x[1]));
 entries.forEach(([label,n])=>{const row=document.createElement('div');row.className='impact-area-row';const header=document.createElement('div');const l=document.createElement('span');l.textContent=label;const v=document.createElement('b');v.textContent=n;header.append(l,v);const tr=document.createElement('div');tr.className='impact-area-track';const fill=document.createElement('span');fill.className='impact-area-fill';fill.style.width=(100*n/maxField)+'%';tr.append(fill);row.append(header,tr);area.append(row)});
 }catch(e){console.error('Publication statistics could not load',e);}
});