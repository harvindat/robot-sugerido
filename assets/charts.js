/* ══════════════════════════════════════════════
   charts.js  —  Todas las gráficas del dashboard
   ══════════════════════════════════════════════ */
(function(){
  Chart.defaults.color='#8b949e';
  Chart.defaults.font.family="'Segoe UI',system-ui,sans-serif";
  Chart.defaults.font.size=11;
  Chart.defaults.plugins.legend.labels.boxWidth=10;
  Chart.defaults.plugins.legend.labels.padding=12;

  const G='rgba(48,54,61,0.5)',M='#8b949e';
  const T={color:M,font:{size:10}};
  const fK=v=>{if(!v&&v!==0)return'';const a=Math.abs(v),s=v<0?'-':'';return a>=1e6?s+'$'+(a/1e6).toFixed(1)+'M':a>=1e3?s+'$'+(a/1e3).toFixed(0)+'K':s+'$'+a.toFixed(0)};
  const fN=v=>v===null||isNaN(v)?'—':(v<0?'-':'')+'$'+Math.abs(Math.round(v)).toLocaleString('es-MX');
  const avg=arr=>{const f=arr.filter(v=>v!==null&&!isNaN(v));return f.length?f.reduce((a,b)=>a+b,0)/f.length:0};
  const CH={};
  function mk(id,cfg){if(CH[id])CH[id].destroy();const el=document.getElementById(id);if(!el)return;CH[id]=new Chart(el,cfg)}

  const baseOpts=(yfmt='$')=>({
    responsive:true,maintainAspectRatio:false,
    interaction:{mode:'index',intersect:false},
    plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>yfmt==='$'?' '+fN(c.raw):' '+c.raw}}},
    scales:{x:{grid:{color:G},ticks:{...T,maxRotation:40,autoSkip:true,maxTicksLimit:12}},y:{grid:{color:G},ticks:{...T,callback:v=>yfmt==='$'?fK(v):v}}}
  });

  /* ══ DASHBOARD GLOBAL ══════════════════════ */
  window.buildDashboard = function(){
    const {kpis,clientes,catalogo} = window.RB;

    // Ventas por línea - barras horizontales
    const vl = Object.entries(kpis.ventaLinea).sort((a,b)=>b[1]-a[1]).slice(0,12);
    mk('chartVentaLinea',{type:'bar',data:{
      labels:vl.map(x=>x[0]),
      datasets:[{label:'Ventas $',data:vl.map(x=>x[1]),
        backgroundColor:vl.map((_,i)=>['#3b82f6','#22c55e','#f59e0b','#a78bfa','#f87171','#22d3ee'][i%6]+'cc'),
        borderRadius:4,borderSkipped:false}]},
      options:{...baseOpts('$'),indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+fN(c.raw)}}},
        scales:{x:{grid:{color:G},ticks:{...T,callback:fK}},y:{grid:{display:false},ticks:{...T,font:{size:10}}}}}});

    // Top 10 clientes por venta
    const tc = kpis.topClientes.slice(0,10);
    mk('chartTopClientes',{type:'bar',data:{
      labels:tc.map(c=>c.nombre.split(' ')[0]+' '+c.nombre.split(' ')[1]||''),
      datasets:[{label:'Ventas $',data:tc.map(c=>c.ventaTotal),
        backgroundColor:tc.map((_,i)=>['#3b82f6','#22c55e','#f59e0b','#a78bfa','#f87171','#22d3ee'][i%6]+'cc'),
        borderRadius:4}]},
      options:{...baseOpts('$'),plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+fN(c.raw)}}}}});

    // Activos vs Inactivos
    const artsStock = kpis.artsConStock;
    const inact     = kpis.inactivosN;
    const sinStock  = kpis.totalArts - artsStock;
    mk('chartInventario',{type:'doughnut',data:{
      labels:['Con stock activo','Sin stock','Inactivos (INA)'],
      datasets:[{data:[artsStock,sinStock,inact],
        backgroundColor:['#22c55e99','#3b82f699','#f8717199'],
        borderColor:'#161b22',borderWidth:3,hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
        plugins:{legend:{position:'right'},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw.toLocaleString()}`}}}}});

    // Sugeridos R1 vs R2 vs R3 por cliente (top 10)
    const {r1,r2,r3} = window.RB;
    const top10 = kpis.topClientes.slice(0,10).map(c=>c.nombre);
    const getN=(arr,nombre,key='sugeridos')=>arr.find(x=>x.nombre===nombre)?.[key]?.length||0;
    mk('chartComparativo',{type:'bar',data:{
      labels:top10.map(n=>n.split(' ')[0]),
      datasets:[
        {label:'R1 (líneas)',data:top10.map(n=>getN(r1,n)),backgroundColor:'#3b82f6aa',borderRadius:3},
        {label:'R2 (top 20%)',data:top10.map(n=>getN(r2,n)),backgroundColor:'#22c55eaa',borderRadius:3},
        {label:'R3 (nuevas líneas)',data:top10.map(n=>getN(r3,n)),backgroundColor:'#f59e0baa',borderRadius:3},
      ]},options:{...baseOpts('num'),plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},scales:{x:{grid:{display:false},ticks:T},y:{grid:{color:G},ticks:T}}}});
  };

  /* ══ R1 — SUGERIDO POR LÍNEAS COMPRADAS ═══ */
  window.buildR1Charts = function(clienteNombre){
    const {r1,catalogo} = window.RB;
    const cli = r1.find(c=>c.nombre===clienteNombre);
    if(!cli) return;

    // Por línea
    const porLinea={};
    cli.sugeridos.forEach(a=>{porLinea[a.linea]=(porLinea[a.linea]||0)+1});
    const lineas=Object.entries(porLinea).sort((a,b)=>b[1]-a[1]);
    mk('chartR1Lineas',{type:'bar',data:{
      labels:lineas.map(x=>x[0]),
      datasets:[{label:'Sugeridos',data:lineas.map(x=>x[1]),
        backgroundColor:lineas.map((_,i)=>['#3b82f6','#22c55e','#f59e0b','#a78bfa','#f87171','#22d3ee'][i%6]+'cc'),
        borderRadius:4}]},
      options:{...baseOpts('num'),indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:G},ticks:T},y:{grid:{display:false},ticks:{...T,font:{size:10}}}}}});

    // Stock disponible por línea
    const stockLinea={};
    cli.sugeridos.forEach(a=>{stockLinea[a.linea]=(stockLinea[a.linea]||0)+a.exist});
    const sl=Object.entries(stockLinea).sort((a,b)=>b[1]-a[1]);
    mk('chartR1Stock',{type:'bar',data:{
      labels:sl.map(x=>x[0]),
      datasets:[{label:'Piezas en almacén',data:sl.map(x=>x[1]),backgroundColor:'#22c55e88',borderRadius:4}]},
      options:{...baseOpts('num'),indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:G},ticks:T},y:{grid:{display:false},ticks:{...T,font:{size:10}}}}}});
  };

  /* ══ R2 — TOP 20% ROTACIÓN ═════════════════ */
  window.buildR2Charts = function(clienteNombre){
    const {r2} = window.RB;
    const cli = r2.find(c=>c.nombre===clienteNombre);
    if(!cli) return;

    const porLinea={};
    cli.sugeridos.forEach(a=>{porLinea[a.linea]=(porLinea[a.linea]||0)+1});
    const lineas=Object.entries(porLinea).sort((a,b)=>b[1]-a[1]);
    mk('chartR2Lineas',{type:'bar',data:{
      labels:lineas.map(x=>x[0]),
      datasets:[{label:'Sugeridos Top 20%',data:lineas.map(x=>x[1]),
        backgroundColor:lineas.map((_,i)=>['#a78bfa','#22d3ee','#f59e0b','#3b82f6','#22c55e','#f87171'][i%6]+'cc'),
        borderRadius:4}]},
      options:{...baseOpts('num'),indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:G},ticks:T},y:{grid:{display:false},ticks:{...T,font:{size:10}}}}}});

    // Score distribution
    const buckets=[0,0,0,0,0];
    cli.sugeridos.forEach(a=>{
      if(a.score>=8)buckets[4]++;
      else if(a.score>=6)buckets[3]++;
      else if(a.score>=4)buckets[2]++;
      else if(a.score>=2)buckets[1]++;
      else buckets[0]++;
    });
    mk('chartR2Score',{type:'doughnut',data:{
      labels:['Score 0-2','Score 2-4','Score 4-6','Score 6-8','Score 8-10'],
      datasets:[{data:buckets,backgroundColor:['#f8717188','#f59e0b88','#3b82f688','#22c55e88','#a78bfa88'],
        borderColor:'#161b22',borderWidth:2,hoverOffset:5}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
        plugins:{legend:{position:'right'},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}`}}}}});
  };

  /* ══ R3 — LÍNEAS NO TRABAJADAS ═════════════ */
  window.buildR3Charts = function(clienteNombre){
    const {r3} = window.RB;
    const cli = r3.find(c=>c.nombre===clienteNombre);
    if(!cli) return;

    const porLinea={};
    cli.sugeridos.forEach(a=>{
      if(!porLinea[a.linea]) porLinea[a.linea]={arts:0,piezas:0};
      porLinea[a.linea].arts++;
      porLinea[a.linea].piezas+=a.sug20;
    });
    const lineas=Object.entries(porLinea).sort((a,b)=>b[1].piezas-a[1].piezas);
    mk('chartR3Lineas',{type:'bar',data:{
      labels:lineas.map(x=>x[0]),
      datasets:[
        {label:'Artículos',data:lineas.map(x=>x[1].arts),backgroundColor:'#f59e0b88',borderRadius:3,yAxisID:'y'},
        {label:'Piezas (20%)',data:lineas.map(x=>x[1].piezas),backgroundColor:'#3b82f688',borderRadius:3,yAxisID:'y1'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},
        scales:{
          x:{grid:{display:false},ticks:{...T,maxRotation:40}},
          y:{grid:{color:G},ticks:T,position:'left',title:{display:true,text:'Artículos',color:M,font:{size:10}}},
          y1:{grid:{display:false},ticks:T,position:'right',title:{display:true,text:'Piezas',color:M,font:{size:10}}},
        }}});
  };

  /* ══ CONSOLIDADO — comparativo todos clientes ═ */
  window.buildConsolidado = function(){
    const {r1,r2,r3,clientes} = window.RB;
    const fmtN=n=>n.split(' ')[0];
    const nombres = clientes.map(c=>c.nombre);

    mk('chartConsR1',{type:'bar',data:{
      labels:nombres.map(fmtN),
      datasets:[
        {label:'Sugeridos R1',data:nombres.map(n=>r1.find(x=>x.nombre===n)?.sugeridos.length||0),backgroundColor:'#3b82f699',borderRadius:3},
        {label:'Líneas activas',data:nombres.map(n=>r1.find(x=>x.nombre===n)?.lineasCompra.length||0),backgroundColor:'#22c55e99',borderRadius:3,yAxisID:'y1'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},
        scales:{
          x:{grid:{display:false},ticks:{...T,maxRotation:45,autoSkip:true,maxTicksLimit:15}},
          y:{grid:{color:G},ticks:T,title:{display:true,text:'Sugeridos',color:M,font:{size:10}}},
          y1:{grid:{display:false},ticks:T,position:'right',title:{display:true,text:'Líneas',color:M,font:{size:10}}},
        }}});

    mk('chartConsVentas',{type:'bar',data:{
      labels:nombres.map(fmtN),
      datasets:[{label:'Ventas $',
        data:clientes.map(c=>c.ventaTotal),
        backgroundColor:clientes.map((_,i)=>['#3b82f6','#22c55e','#f59e0b','#a78bfa','#f87171','#22d3ee'][i%6]+'99'),
        borderRadius:3}]},
      options:{...baseOpts('$'),plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false},ticks:{...T,maxRotation:45,autoSkip:true,maxTicksLimit:15}},y:{grid:{color:G},ticks:{...T,callback:fK}}}}});

    mk('chartConsR3',{type:'bar',data:{
      labels:nombres.map(fmtN),
      datasets:[
        {label:'Líneas faltantes',data:nombres.map(n=>r3.find(x=>x.nombre===n)?.lineasFaltantes.length||0),backgroundColor:'#f59e0b99',borderRadius:3},
        {label:'Piezas sugeridas',data:nombres.map(n=>r3.find(x=>x.nombre===n)?.totalPiezas||0),backgroundColor:'#a78bfa99',borderRadius:3,yAxisID:'y1'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},
        scales:{
          x:{grid:{display:false},ticks:{...T,maxRotation:45,autoSkip:true,maxTicksLimit:15}},
          y:{grid:{color:G},ticks:T,title:{display:true,text:'Líneas',color:M,font:{size:10}}},
          y1:{grid:{display:false},ticks:T,position:'right',title:{display:true,text:'Piezas',color:M,font:{size:10}}},
        }}});
  };


  /* ══ R4 — TOP SCORE ROTACIÓN INDIVIDUAL ════ */
  window.buildR4Charts = function(clienteNombre){
    const {r4} = window.RB;
    const cli = r4.find(c=>c.nombre===clienteNombre);
    if(!cli||!cli.arts.length) return;

    const G='rgba(48,54,61,0.5)',M='#8b949e',T={color:M,font:{size:9}};
    const fK=v=>{const a=Math.abs(v),s=v<0?'-':'';return a>=1e6?s+'$'+(a/1e6).toFixed(1)+'M':a>=1e3?s+'$'+(a/1e3).toFixed(0)+'K':s+'$'+a.toFixed(0)};
    const fN=v=>'$'+Math.abs(Math.round(v)).toLocaleString('es-MX');

    // Top 15 por score — barras horizontales
    const top15 = cli.arts.slice(0,15);
    mk('chartR4TopScore',{type:'bar',data:{
      labels: top15.map(a=>a.clave),
      datasets:[
        {label:'Score',data:top15.map(a=>a.score),
         backgroundColor:top15.map(a=>a.score>=7?'#27ae6099':a.score>=4?'#d4ac0d99':'#c0392b99'),
         borderRadius:4,borderSkipped:false,yAxisID:'y'},
        {label:'Unidades',data:top15.map(a=>a.uds),
         backgroundColor:'#2e86c133',borderRadius:4,type:'bar',yAxisID:'y1'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{position:'top'},tooltip:{callbacks:{
          label:c=>c.dataset.label==='Score'?` Score: ${c.raw}`:` Uds: ${c.raw}`}}},
        scales:{
          x:{grid:{color:G},ticks:T},
          y:{grid:{display:false},ticks:{...T,font:{size:9}}},
          y1:{grid:{display:false},ticks:T,position:'right',
              title:{display:true,text:'Uds',color:M,font:{size:9}}},
        }}});

    // Ventas por línea — dona
    const lineas = Object.entries(cli.porLinea).sort((a,b)=>b[1].venta-a[1].venta).slice(0,8);
    const CLRS=['#c0392b','#e67e22','#d4ac0d','#27ae60','#148f77','#2e86c1','#7d3c98','#a93226'];
    mk('chartR4Lineas',{type:'doughnut',data:{
      labels:lineas.map(x=>x[0]),
      datasets:[{data:lineas.map(x=>x[1].venta),
        backgroundColor:CLRS.map(c=>c+'99'),borderColor:'#120a0a',borderWidth:2,hoverOffset:5}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
        plugins:{legend:{position:'right',labels:{font:{size:9},boxWidth:8}},
          tooltip:{callbacks:{label:c=>` ${c.label}: ${fK(c.raw)}`}}}}});

    // Stock vs Stock sugerido — top 10
    const top10 = cli.arts.slice(0,10);
    mk('chartR4Stock',{type:'bar',data:{
      labels:top10.map(a=>a.clave),
      datasets:[
        {label:'Stock actual',data:top10.map(a=>a.stock),backgroundColor:'#2e86c188',borderRadius:3},
        {label:'Uds compradas',data:top10.map(a=>a.uds),backgroundColor:'#c0392b88',borderRadius:3},
        {label:'Stock sugerido (1.5x)',data:top10.map(a=>a.stockSugerido),backgroundColor:'#27ae6066',borderRadius:3,type:'line',borderColor:'#27ae60',borderWidth:2,pointRadius:4},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},
        scales:{x:{grid:{display:false},ticks:T},y:{grid:{color:G},ticks:T}}}});
  };

  document.addEventListener('rbready', window.buildDashboard);
})();

  /* ══ R5 — CHARTS GLOBALES ═══════════════════ */
  window.buildR5Charts = function(){
    const r5=window.RB.r5; if(!r5) return;
    const arts=r5.arts.filter(a=>a.compra>0||a.semaforo==='ROJO');

    // Por línea: stacked ROJO/AMARILLO/VERDE
    const linMap={};
    arts.forEach(a=>{
      if(!linMap[a.linea]) linMap[a.linea]={R:0,A:0,V:0};
      if(a.semaforo==='ROJO')linMap[a.linea].R++;
      else if(a.semaforo==='AMARILLO')linMap[a.linea].A++;
      else linMap[a.linea].V++;
    });
    const topLin=Object.entries(linMap).sort((a,b)=>(b[1].R+b[1].A)-(a[1].R+a[1].A)).slice(0,12);
    mk('chartR5Lineas',{type:'bar',data:{
      labels:topLin.map(x=>x[0]),
      datasets:[
        {label:'ROJO (<7d)',  data:topLin.map(x=>x[1].R),backgroundColor:'#e24b4a99',borderRadius:3},
        {label:'AMARILLO (7-30d)',data:topLin.map(x=>x[1].A),backgroundColor:'#f59e0b99',borderRadius:3},
        {label:'VERDE (≥30d)',data:topLin.map(x=>x[1].V),backgroundColor:'#22c55e66',borderRadius:3},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw} arts`}}},
        scales:{x:{stacked:true,grid:{display:false},ticks:{...T,maxRotation:40,font:{size:9}}},
                y:{stacked:true,grid:{color:G},ticks:T}}}});

    // ABC donut
    const abc={A:r5.arts.filter(a=>a.abc==='A').length,B:r5.arts.filter(a=>a.abc==='B').length,C:r5.arts.filter(a=>a.abc==='C').length};
    mk('chartR5Abc',{type:'doughnut',data:{
      labels:['A — top 80% venta','B — 80-95%','C — cola larga'],
      datasets:[{data:[abc.A,abc.B,abc.C],
        backgroundColor:['#7d3c9899','#2e86c199','#95a5a699'],
        borderColor:'#161b22',borderWidth:2,hoverOffset:5}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
        plugins:{legend:{position:'right'},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw} arts`}}}}});
  };

  /* ══ R5 — CHARTS POR CLIENTE ═══════════════ */
  window.buildR5CliCharts = function(nombre){
    const r5=window.RB.r5; if(!r5) return;
    const cli=r5.porCliente.find(c=>c.nombre===nombre); if(!cli) return;

    // Top 15 por score: Stock actual vs Sugerido vs A surtir
    const top15=cli.arts.slice(0,15);
    mk('chartR5CliStock',{type:'bar',data:{
      labels:top15.map(a=>a.clave),
      datasets:[
        {label:'Stock actual', data:top15.map(a=>a.exist),backgroundColor:'#2e86c188',borderRadius:3},
        {label:'A surtir',data:top15.map(a=>a.aReforzar),backgroundColor:'#e24b4a99',borderRadius:3},
        {label:'Sugerido',data:top15.map(a=>a.sugerido),type:'line',borderColor:'#27ae60',borderWidth:2,pointRadius:3,backgroundColor:'transparent'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},
        scales:{x:{grid:{display:false},ticks:{...T,font:{size:9}}},y:{grid:{color:G},ticks:T}}}});

    // Acción donut
    const acc={C:cli.arts.filter(a=>a.accion==='COMPRAR').length,R:cli.arts.filter(a=>a.accion==='REFORZAR').length,V:cli.arts.filter(a=>a.accion==='CUBIERTO').length};
    mk('chartR5CliSema',{type:'doughnut',data:{
      labels:['Comprar (sin stock)','Reforzar (parcial)','Cubierto'],
      datasets:[{data:[acc.C,acc.R,acc.V],
        backgroundColor:['#e24b4a88','#f59e0b88','#22c55e88'],
        borderColor:'#161b22',borderWidth:2,hoverOffset:5}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
        plugins:{legend:{position:'right'},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw} arts`}}}}});
  };

