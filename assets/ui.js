/* ══════════════════════════════════════════════
   ui.js v3 — KPIs, tablas, filtros, R5
   ══════════════════════════════════════════════ */
(function(){
  const fN=v=>v===null||isNaN(v)?'—':(v<0?'-':'')+'$'+Math.abs(Math.round(v)).toLocaleString('es-MX');
  const fK=v=>{if(!v&&v!==0)return'—';const a=Math.abs(v),s=v<0?'-':'';return a>=1e6?s+'$'+(a/1e6).toFixed(2)+'M':a>=1e3?s+'$'+(a/1e3).toFixed(0)+'K':s+'$'+a.toFixed(0)};
  const fP=v=>v>0?'$'+v.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
  const built={};

  /* ── Header ─────────────────────────────── */
  function buildHeader(){
    const {kpis,clientes}=window.RB;
    document.getElementById('hdr-clientes').innerHTML='Clientes: <b>'+clientes.length+'</b>';
    document.getElementById('hdr-ventas').innerHTML='Ventas: <b>'+fK(kpis.ventaTotal)+'</b>';
    document.getElementById('hdr-arts').innerHTML='Almacén: <b>'+kpis.totalArts.toLocaleString()+'</b> arts';
  }

  /* ── KPIs Dashboard ───────────────────── */
  function buildKPIs(){
    const {kpis,r1,r2,r3,r5}=window.RB;
    const g=document.getElementById('kpi-dash');
    if(!g) return;
    const totalR3=r3.reduce((s,c)=>s+c.totalPiezas,0);
    const cards=[
      {cls:'blue',  lbl:'Ventas Totales',   val:fK(kpis.ventaTotal),            sub:'Período',               pill:'info', pt:'Total'},
      {cls:'green', lbl:'Arts. con Stock',   val:kpis.artsConStock.toLocaleString(), sub:'de '+kpis.totalArts.toLocaleString(), pill:'up', pt:'Activos'},
      {cls:'red',   lbl:'Inactivos',         val:kpis.inactivosN.toLocaleString(),  sub:'Sin rotación período', pill:'down', pt:'INA'},
      {cls:'amber', lbl:'Rotación Almacén',  val:kpis.rotPct+'%',                sub:'Uds / stock',           pill:'warn', pt:'Índice'},
      {cls:'purple',lbl:'Sugeridos R1',      val:kpis.sugerR1.toLocaleString(),  sub:'Por líneas compradas',  pill:'info', pt:'Arts.'},
      {cls:'cyan',  lbl:'Sugeridos R2',      val:'<span id="r2-kpi-val">'+kpis.sugerR2.toLocaleString()+'</span>', sub:'Top 20% rotación', pill:'info', pt:'Arts.'},
      {cls:'green', lbl:'Piezas R3',         val:totalR3.toLocaleString(),       sub:'Líneas no trabajadas',  pill:'up',   pt:'Piezas'},
      {cls:'red',   lbl:'R5 — Urgentes',     val:(r5?r5.rojos:0).toLocaleString(), sub:'Stock &lt;7 días cob.',pill:'down', pt:'ROJO'},
    ];
    g.innerHTML=cards.map(c=>'<div class="kpi '+c.cls+'"><div class="kpi-lbl">'+c.lbl+'</div><div class="kpi-val">'+c.val+'</div><div class="kpi-sub">'+c.sub+'</div><span class="kpi-pill '+c.pill+'">'+c.pt+'</span></div>').join('');
  }

  /* ── R5 KPIs ──────────────────────────── */
  window.buildR5KPIs = function(){
    const r5=window.RB.r5;
    if(!r5) return;
    const g=document.getElementById('r5-kpis-global');
    if(!g) return;
    g.innerHTML=
      '<div class="kpi red"><div class="kpi-lbl">🔴 Urgente (ROJO)</div><div class="kpi-val">'+r5.rojos+'</div><div class="kpi-sub">Cobertura &lt;7 días</div><span class="kpi-pill down">Arts.</span></div>'+
      '<div class="kpi amber"><div class="kpi-lbl">🟡 Próximo (AMARILLO)</div><div class="kpi-val">'+r5.amarillos+'</div><div class="kpi-sub">Cobertura 7–30 días</div><span class="kpi-pill warn">Arts.</span></div>'+
      '<div class="kpi green"><div class="kpi-lbl">🟢 Saludable (VERDE)</div><div class="kpi-val">'+r5.verdes+'</div><div class="kpi-sub">Cobertura ≥30 días</div><span class="kpi-pill up">Arts.</span></div>'+
      '<div class="kpi blue"><div class="kpi-lbl">💰 Inversión estimada</div><div class="kpi-val">'+fK(r5.totalInversion)+'</div><div class="kpi-sub">'+r5.totalCompra.toLocaleString()+' piezas a comprar</div><span class="kpi-pill info">Total</span></div>';
  };

  /* ── Tabla resumen ────────────────────── */
  function buildTablaResumen(){
    const {clientes,r1,r2,r3,r5}=window.RB;
    const div=document.getElementById('tabla-resumen'); if(!div) return;
    let h='<table><thead><tr><th>Cliente</th><th>Ventas $</th><th>Arts.</th><th>Líneas</th><th>Sug. R1</th><th>Val. R1</th><th>Sug. R2</th><th>Lin. Falt.</th><th>Pzas R3</th><th>R5 Urgente</th></tr></thead><tbody>';
    [...clientes].sort((a,b)=>b.ventaTotal-a.ventaTotal).forEach(cli=>{
      const cr1=r1.find(x=>x.nombre===cli.nombre)||{};
      const cr2=r2.find(x=>x.nombre===cli.nombre)||{};
      const cr3=r3.find(x=>x.nombre===cli.nombre)||{};
      const cr5=r5?r5.porCliente.find(x=>x.nombre===cli.nombre):null;
      h+='<tr><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">'+cli.nombre+'</td>'
        +'<td>'+fK(cli.ventaTotal)+'</td>'
        +'<td>'+cli.arts.length+'</td>'
        +'<td>'+(cr1.lineasCompra?cr1.lineasCompra.length:0)+'</td>'
        +'<td><span class="pill b">'+(cr1.sugeridos?cr1.sugeridos.length:0)+'</span></td>'
        +'<td style="font-size:11px;color:var(--green)">'+fK(cr1.valorTotalSug||0)+'</td>'
        +'<td><span class="pill p">'+(cr2.sugeridos?cr2.sugeridos.length:0)+'</span></td>'
        +'<td>'+(cr3.lineasFaltantes?cr3.lineasFaltantes.length:0)+'</td>'
        +'<td><span class="pill a">'+(cr3.totalPiezas||0)+'</span></td>'
        +'<td><span class="pill r">'+(cr5?cr5.urgentes:0)+'</span></td></tr>';
    });
    div.innerHTML=h+'</tbody></table>';
  }

  /* ── Selector de cliente ─────────────── */
  function buildClienteSelector(selectId, onChange){
    const sel=document.getElementById(selectId); if(!sel) return;
    sel.innerHTML='<option value="">— Selecciona cliente —</option>';
    window.RB.clientes.forEach(c=>{
      const opt=document.createElement('option');
      opt.value=c.nombre; opt.textContent=c.nombre;
      sel.appendChild(opt);
    });
    sel.onchange=function(){ onChange(sel.value); };
  }

  /* ══ R1 ════════════════════════════════ */
  function buildTablaR1(nombre, filtroLinea){
    filtroLinea=filtroLinea||'';
    const cli=window.RB.r1.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r1');
    if(!div||!cli) return;
    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);
    const totalValor=sug.reduce((s,a)=>s+a.valorSug,0);
    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Existencia</th><th>Precio unit.</th><th>Valor almacén</th></tr></thead><tbody>';
    if(!sug.length) h+='<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    sug.forEach(a=>{
      h+='<tr><td>'+a.clave+'</td><td style="max-width:300px">'+a.desc+'</td>'
        +'<td><span class="pill b">'+a.linea+'</span></td>'
        +'<td style="text-align:center">'+a.exist+'</td>'
        +'<td class="col-precio"><span class="pill precio">'+fP(a.precio)+'</span></td>'
        +'<td class="col-valor"><span class="pill valor">'+fK(a.valorSug)+'</span></td></tr>';
    });
    h+='</tbody><tfoot><tr><td colspan="5" style="text-align:right;font-size:11px;font-weight:600;padding:6px 8px;color:var(--muted)">Valor total de la propuesta:</td><td class="col-valor" style="padding:6px 4px"><span class="pill valor">'+fK(totalValor)+'</span></td></tr></tfoot>';
    div.innerHTML=h+'</table>';
    document.getElementById('r1-count').textContent=sug.length+' artículos sugeridos · '+fK(totalValor)+' en almacén';
  }

  function buildFiltroR1(nombre){
    const cli=window.RB.r1.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r1');
    if(!row||!cli) return;
    const lineas=[...new Set(cli.sugeridos.map(a=>a.linea))].sort();
    let h='<span class="filter-lbl">Línea:</span><button class="fbtn on" onclick="filtrarR1(this,\'\')">Todas</button>';
    lineas.forEach(function(l){ h+='<button class="fbtn" onclick="filtrarR1(this,\''+l+'\')">'+l+'</button>'; });
    row.innerHTML=h;
  }

  window.filtrarR1=function(btn,linea){
    document.querySelectorAll('#filtro-linea-r1 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    buildTablaR1(document.getElementById('sel-cliente-r1').value, linea);
  };

  window.onClienteR1=function(n){
    if(!n) return;
    buildFiltroR1(n); buildTablaR1(n,'');
    if(window.buildR1Charts) window.buildR1Charts(n);
    const btn=document.getElementById('btn-exp-r1'); if(btn) btn.style.display='flex';
  };

  /* ══ R2 ════════════════════════════════ */
  function buildTablaR2(nombre, filtroLinea){
    filtroLinea=filtroLinea||'';
    const cli=window.RB.r2.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r2');
    if(!div||!cli) return;
    const pct=window.RB._r2pct||20;
    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);
    const totalValor=sug.reduce((s,a)=>s+a.valorSug,0);
    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Exist.</th><th>Score</th><th>Rank</th><th>Uds</th><th>Precio unit.</th><th>Valor almacén</th></tr></thead><tbody>';
    if(!sug.length) h+='<tr><td colspan="9" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    sug.forEach(a=>{
      const scls=a.score>=7?'g':a.score>=4?'a':'r';
      h+='<tr><td>'+a.clave+'</td><td style="max-width:240px">'+a.desc+'</td>'
        +'<td><span class="pill p">'+a.linea+'</span></td>'
        +'<td style="text-align:center">'+a.exist+'</td>'
        +'<td style="text-align:center"><span class="pill '+scls+'">'+a.score+'</span></td>'
        +'<td style="text-align:center">#'+a.rank+'</td>'
        +'<td style="text-align:center">'+a.udsTotal+'</td>'
        +'<td class="col-precio"><span class="pill precio">'+fP(a.precio)+'</span></td>'
        +'<td class="col-valor"><span class="pill valor">'+fK(a.valorSug)+'</span></td></tr>';
    });
    h+='</tbody><tfoot><tr><td colspan="8" style="text-align:right;font-size:11px;font-weight:600;padding:6px 8px;color:var(--muted)">Valor total propuesta:</td><td class="col-valor" style="padding:6px 4px"><span class="pill valor">'+fK(totalValor)+'</span></td></tr></tfoot>';
    div.innerHTML=h+'</table>';
    document.getElementById('r2-count').textContent=sug.length+' arts top '+pct+'% · '+fK(totalValor)+' en almacén';
  }

  function buildFiltroR2(nombre){
    const cli=window.RB.r2.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r2'); if(!row||!cli) return;
    const lineas=[...new Set(cli.sugeridos.map(a=>a.linea))].sort();
    let h='<span class="filter-lbl">Línea:</span><button class="fbtn on" onclick="filtrarR2(this,\'\')">Todas</button>';
    lineas.forEach(function(l){ h+='<button class="fbtn" onclick="filtrarR2(this,\''+l+'\')">'+l+'</button>'; });
    row.innerHTML=h;
  }

  window.filtrarR2=function(btn,linea){
    document.querySelectorAll('#filtro-linea-r2 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    buildTablaR2(document.getElementById('sel-cliente-r2').value, linea);
  };

  window.onClienteR2=function(n){
    if(!n) return;
    buildFiltroR2(n); buildTablaR2(n,'');
    if(window.buildR2Charts) window.buildR2Charts(n);
    const btn=document.getElementById('btn-exp-r2'); if(btn) btn.style.display='flex';
    const t=document.getElementById('r2-pct-title'); if(t) t.textContent=(window.RB._r2pct||20)+'%';
  };

  window.recalcularR2=function(pct){
    const pctNum=parseInt(pct)||20;
    window.RB._r2pct=pctNum;
    document.getElementById('r2-pct-val').textContent=pctNum+'%';
    const {inv,catalogo,inactivos,clientes,precioMap}=window.RB;
    const rotMap={};
    clientes.forEach(cli=>cli.arts.forEach(a=>{if(a.uds>0) rotMap[a.clave]=(rotMap[a.clave]||0)+a.uds;}));
    const sorted=Object.entries(rotMap).sort((a,b)=>b[1]-a[1]);
    const topN=Math.ceil(sorted.length*(pctNum/100));
    const topSet=new Set(sorted.slice(0,topN).map(x=>x[0]));
    const activos=new Set(Object.keys(inv).filter(k=>inv[k].exist>0&&!inactivos.has(k)));
    const sugeribles=[...topSet].filter(k=>activos.has(k));
    const maxRot=sorted[0]?sorted[0][1]:1;
    const scoreMap={};
    sorted.forEach(([k,v],i)=>{scoreMap[k]={score:+(v/maxRot*10).toFixed(1),rank:i+1,uds:v};});
    window.RB.r2=clientes.map(cli=>{
      const compradas=new Set(cli.arts.map(a=>(catalogo[a.clave]||{}).linea).filter(Boolean));
      const ya=new Set(cli.arts.map(a=>a.clave));
      const sug=sugeribles.filter(k=>{const l=(catalogo[k]||{}).linea||'';return l&&compradas.has(l)&&!ya.has(k);})
        .map(k=>{const sm=scoreMap[k]||{};const precio=precioMap[k]||0;return{clave:k,desc:(catalogo[k]||{}).desc,linea:(catalogo[k]||{}).linea,exist:inv[k].exist,score:sm.score||0,rank:sm.rank||0,udsTotal:rotMap[k]||0,precio,valorSug:+(precio*inv[k].exist).toFixed(0)};})
        .sort((a,b)=>b.score-a.score);
      return{nombre:cli.nombre,ventaTotal:cli.ventaTotal,lineasCompra:[...compradas],sugeridos:sug,scoreMap,valorTotalSug:sug.reduce((s,a)=>s+a.valorSug,0)};
    });
    const totalSugR2=window.RB.r2.reduce((s,c)=>s+c.sugeridos.length,0);
    const kv=document.getElementById('r2-kpi-val'); if(kv) kv.textContent=totalSugR2.toLocaleString();
    const sel=document.getElementById('sel-cliente-r2');
    if(sel&&sel.value){buildFiltroR2(sel.value);buildTablaR2(sel.value,'');if(window.buildR2Charts)window.buildR2Charts(sel.value);}
  };

  /* ══ R3 ════════════════════════════════ */
  function buildTablaR3(nombre, filtroLinea){
    filtroLinea=filtroLinea||'';
    const cli=window.RB.r3.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r3'); if(!div||!cli) return;
    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);
    const totalValor=sug.reduce((s,a)=>s+a.valorSug20,0);
    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Existencia</th><th>Sugerido 20%</th><th>Precio unit.</th><th>Valor propuesta</th></tr></thead><tbody>';
    if(!sug.length) h+='<tr><td colspan="7" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    sug.forEach(a=>{
      h+='<tr><td>'+a.clave+'</td><td style="max-width:260px">'+a.desc+'</td>'
        +'<td><span class="pill a">'+a.linea+'</span></td>'
        +'<td style="text-align:center">'+a.exist+'</td>'
        +'<td style="text-align:center;font-weight:600;color:var(--amber)">'+a.sug20+'</td>'
        +'<td class="col-precio"><span class="pill precio">'+fP(a.precio)+'</span></td>'
        +'<td class="col-valor"><span class="pill inv">'+fK(a.valorSug20)+'</span></td></tr>';
    });
    h+='</tbody><tfoot><tr><td colspan="6" style="text-align:right;font-size:11px;font-weight:600;padding:6px 8px;color:var(--muted)">Inversión estimada propuesta:</td><td class="col-valor" style="padding:6px 4px"><span class="pill inv">'+fK(totalValor)+'</span></td></tr></tfoot>';
    div.innerHTML=h+'</table>';
    document.getElementById('r3-count').textContent=sug.length+' arts · '+cli.totalPiezas+' pzas · '+fK(totalValor)+' inversión';
  }

  function buildFiltroR3(nombre){
    const cli=window.RB.r3.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r3'); if(!row||!cli) return;
    let h='<span class="filter-lbl">Línea nueva:</span><button class="fbtn on" onclick="filtrarR3(this,\'\')">Todas</button>';
    cli.lineasFaltantes.sort().forEach(function(l){ h+='<button class="fbtn" onclick="filtrarR3(this,\''+l+'\')">'+l+'</button>'; });
    row.innerHTML=h;
  }

  window.filtrarR3=function(btn,linea){
    document.querySelectorAll('#filtro-linea-r3 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    buildTablaR3(document.getElementById('sel-cliente-r3').value, linea);
  };

  window.onClienteR3=function(n){
    if(!n) return;
    buildFiltroR3(n); buildTablaR3(n,'');
    if(window.buildR3Charts) window.buildR3Charts(n);
    const btn=document.getElementById('btn-exp-r3'); if(btn) btn.style.display='flex';
  };

  /* ══ R4 ════════════════════════════════ */
  function buildTablaR4(nombre, filtroLinea, filtroAlerta){
    filtroLinea=filtroLinea||''; filtroAlerta=filtroAlerta||'';
    const cli=window.RB.r4.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r4'); if(!div||!cli) return;
    let arts=cli.arts;
    if(filtroLinea)  arts=arts.filter(a=>a.linea===filtroLinea);
    if(filtroAlerta) arts=arts.filter(a=>a.alertaStock===filtroAlerta);
    let h='<table><thead><tr><th>Rank</th><th>Clave</th><th>Descripción</th><th>Línea</th>'
      +'<th>Uds</th><th>Venta $</th><th>Precio unit.</th><th>Score</th><th>Stock</th><th>Sug.1.5x</th><th>Alerta</th></tr></thead><tbody>';
    if(!arts.length) h+='<tr><td colspan="11" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    arts.forEach(function(a,i){
      var scCls=a.score>=7?'g':a.score>=4?'a':'r';
      var alCls=a.alertaStock==='BAJO'?'r':a.alertaStock==='MEDIO'?'a':'g';
      var rowBg=a.alertaStock==='BAJO'?'background:rgba(192,57,43,0.06)':a.alertaStock==='MEDIO'?'background:rgba(212,172,13,0.05)':'';
      h+='<tr style="'+rowBg+'">'
        +'<td style="text-align:center;color:var(--muted);font-size:10px">#'+(i+1)+'</td>'
        +'<td>'+a.clave+'</td>'
        +'<td style="max-width:240px;overflow:hidden;text-overflow:ellipsis">'+a.desc+'</td>'
        +'<td><span class="pill b">'+(a.linea||'—')+'</span></td>'
        +'<td style="text-align:center;font-weight:600">'+a.uds+'</td>'
        +'<td>$'+Math.round(a.venta).toLocaleString('es-MX')+'</td>'
        +'<td class="col-precio"><span class="pill precio">'+fP(a.precio_unit)+'</span></td>'
        +'<td style="text-align:center"><span class="pill '+scCls+'">'+a.score+'</span></td>'
        +'<td style="text-align:center;font-weight:600;color:'+(a.alertaStock==='BAJO'?'var(--red)':a.alertaStock==='MEDIO'?'var(--amber)':'var(--green)')+'">'+(a.stock||0)+'</td>'
        +'<td style="text-align:center;font-weight:700;color:var(--green)">'+a.stockSugerido+'</td>'
        +'<td style="text-align:center"><span class="pill '+alCls+'">'+a.alertaStock+'</span></td>'
        +'</tr>';
    });
    div.innerHTML=h+'</tbody></table>';
    var avg=arts.length?+(arts.reduce(function(s,a){return s+a.score;},0)/arts.length).toFixed(1):0;
    document.getElementById('r4-count').textContent=arts.length+' arts · Score prom: '+avg+' · ⚠️ '+cli.alertasBajo+' críticos · 🔔 '+cli.alertasMedio+' medios';
  }

  function buildFiltrosR4(nombre){
    const cli=window.RB.r4.find(c=>c.nombre===nombre); if(!cli) return;
    const lineas=[...new Set(cli.arts.map(a=>a.linea).filter(Boolean))].sort();
    const rowL=document.getElementById('filtro-linea-r4');
    let hL='<span class="filter-lbl">Línea:</span><button class="fbtn on" onclick="filtrarR4L(this,\'\')">Todas</button>';
    lineas.forEach(function(l){ hL+='<button class="fbtn" onclick="filtrarR4L(this,\''+l+'\')">'+l+'</button>'; });
    rowL.innerHTML=hL;
    const rowA=document.getElementById('filtro-alerta-r4');
    let hA='<span class="filter-lbl">Alerta:</span><button class="fbtn on" onclick="filtrarR4A(this,\'\')">Todas</button>';
    hA+='<button class="fbtn" style="border-color:#c0392b;color:#c0392b" onclick="filtrarR4A(this,\'BAJO\')">BAJO</button>';
    hA+='<button class="fbtn" style="border-color:#d4ac0d;color:#d4ac0d" onclick="filtrarR4A(this,\'MEDIO\')">MEDIO</button>';
    hA+='<button class="fbtn" style="border-color:#27ae60;color:#27ae60" onclick="filtrarR4A(this,\'OK\')">OK</button>';
    rowA.innerHTML=hA;
  }

  var _r4linea='', _r4alerta='';
  window.filtrarR4L=function(btn,l){
    document.querySelectorAll('#filtro-linea-r4 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on'); _r4linea=l;
    var sel=document.getElementById('sel-cliente-r4');
    buildTablaR4(sel?sel.value:'',_r4linea,_r4alerta);
  };
  window.filtrarR4A=function(btn,a){
    document.querySelectorAll('#filtro-alerta-r4 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on'); _r4alerta=a;
    var sel=document.getElementById('sel-cliente-r4');
    buildTablaR4(sel?sel.value:'',_r4linea,_r4alerta);
  };
  window.onClienteR4=function(n){
    if(!n) return;
    _r4linea=''; _r4alerta='';
    buildFiltrosR4(n); buildTablaR4(n,'','');
    if(window.buildR4Charts) window.buildR4Charts(n);
    var btn=document.getElementById('btn-exp-r4'); if(btn) btn.style.display='flex';
  };

  /* ══ R5 GLOBAL ══════════════════════════ */
  // Estado de filtros
  var _r5sema='', _r5abc='', _r5linea='';

  window.buildR5GlobalView = function(){
    const r5=window.RB.r5; if(!r5) return;
    const arts=r5.arts;

    // Filtros
    const lineas=[...new Set(arts.map(a=>a.linea).filter(Boolean))].sort();
    const rowF=document.getElementById('r5-filtros-global');
    if(rowF){
      let hF='<span class="filter-lbl">Semáforo:</span>';
      ['','ROJO','AMARILLO','VERDE'].forEach(function(s){
        hF+='<button class="fbtn'+(s===_r5sema?' on':'')+'" onclick="filtrarR5G_sema(this,\''+s+'\')">'+(s||'Todos')+'</button>';
      });
      hF+='<span class="filter-lbl" style="margin-left:8px">ABC:</span>';
      ['','A','B','C'].forEach(function(s){
        hF+='<button class="fbtn'+(s===_r5abc?' on':'')+'" onclick="filtrarR5G_abc(this,\''+s+'\')">'+(s||'Todas')+'</button>';
      });
      hF+='<select onchange="filtrarR5G_linea(this.value)" style="margin-left:8px;padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px">';
      hF+='<option value="">Todas las líneas</option>';
      lineas.forEach(function(l){ hF+='<option value="'+l+'"'+(l===_r5linea?' selected':'')+'>'+l+'</option>'; });
      hF+='</select>';
      rowF.innerHTML=hF;
    }

    let filtered=arts;
    if(_r5sema) filtered=filtered.filter(a=>a.semaforo===_r5sema);
    if(_r5abc)  filtered=filtered.filter(a=>a.abc===_r5abc);
    if(_r5linea)filtered=filtered.filter(a=>a.linea===_r5linea);

    // Solo artículos que requieren compra o son urgentes
    const mostrar=filtered.filter(a=>a.compra>0||a.semaforo==='ROJO');

    const sumCompra=mostrar.reduce((s,a)=>s+a.compra,0);
    const sumInversion=mostrar.reduce((s,a)=>s+a.inversion,0);
    const sumEl=document.getElementById('r5-global-summary');
    if(sumEl) sumEl.textContent=mostrar.length+' artículos · '+sumCompra.toLocaleString()+' piezas · Inversión: '+fK(sumInversion);

    const div=document.getElementById('tabla-r5-global'); if(!div) return;
    if(!mostrar.length){
      div.innerHTML='<p style="color:var(--muted);font-size:12px;padding:10px">No hay artículos con los filtros seleccionados.</p>';
      return;
    }

    let h='<table><thead><tr>'
      +'<th>Clave</th><th>Descripción</th><th>Línea</th><th>ABC</th>'
      +'<th>Uds/per.</th><th>Tasa/día</th><th>Stock</th><th>Cob. días</th>'
      +'<th>Compra sug.</th><th>Precio unit.</th><th>Inversión</th><th>Cli.</th><th>Semáforo</th>'
      +'</tr></thead><tbody>';

    mostrar.slice(0, 500).forEach(function(a){ // max 500 filas para rendimiento
      var scls=a.semaforo==='ROJO'?'sema-r':a.semaforo==='AMARILLO'?'sema-a':'sema-v';
      var acls='abc-'+(a.abc||'c').toLowerCase();
      var cobTxt=a.cobertura>=9999?'∞':a.cobertura+'d';
      h+='<tr>'
        +'<td style="font-size:11px">'+a.clave+'</td>'
        +'<td style="max-width:220px;font-size:11px;overflow:hidden;text-overflow:ellipsis">'+a.desc+'</td>'
        +'<td style="font-size:10px"><span class="pill b">'+a.linea+'</span></td>'
        +'<td style="text-align:center"><span class="pill '+acls+'">'+a.abc+'</span></td>'
        +'<td style="text-align:center;font-size:11px">'+a.udsTotal+'</td>'
        +'<td style="text-align:center;font-size:10px;color:var(--muted)">'+a.tasa+'</td>'
        +'<td style="text-align:center;font-weight:600;font-size:11px">'+a.exist+'</td>'
        +'<td style="text-align:center;font-size:11px;font-weight:600;color:'+(a.cobertura<7?'var(--red)':a.cobertura<30?'var(--amber)':'var(--green)')+'">'+cobTxt+'</td>'
        +'<td style="text-align:center;font-weight:700;color:var(--accent);font-size:12px">'+a.compra+'</td>'
        +'<td class="col-precio" style="font-size:10px">'+(a.precio>0?'$'+a.precio:'—')+'</td>'
        +'<td class="col-valor" style="font-size:11px"><span class="pill inv">'+(a.inversion>0?fK(a.inversion):'—')+'</span></td>'
        +'<td style="text-align:center;font-size:10px;color:var(--muted)">'+a.nClientes+'</td>'
        +'<td style="text-align:center"><span class="pill '+scls+'">'+a.semaforo+'</span></td>'
        +'</tr>';
    });
    div.innerHTML=h+'</tbody></table>';

    // Actualizar charts
    if(window.buildR5Charts) window.buildR5Charts();
  };

  window.filtrarR5G_sema=function(btn,v){ _r5sema=v; window.buildR5GlobalView(); };
  window.filtrarR5G_abc =function(btn,v){ _r5abc=v;  window.buildR5GlobalView(); };
  window.filtrarR5G_linea=function(v){   _r5linea=v; window.buildR5GlobalView(); };

  /* ══ R5 POR CLIENTE ════════════════════ */
  window.onClienteR5 = function(nombre){
    if(!nombre) return;
    const r5=window.RB.r5; if(!r5) return;
    const cli=r5.porCliente.find(c=>c.nombre===nombre);
    if(!cli){ document.getElementById('tabla-r5-cli').innerHTML='<p style="color:var(--muted);font-size:12px;padding:10px">Cliente no encontrado.</p>'; return; }

    // MEJORA 4 — Resumen ejecutivo (ficha de acción para el vendedor)
    renderResumenEjecutivo(cli);

    // Filtros por acción
    const rowF=document.getElementById('r5-filtros-cli');
    if(rowF){
      let hF='<span class="filter-lbl">Acción:</span>';
      [['','Todas'],['COMPRAR','Comprar'],['REFORZAR','Reforzar'],['CUBIERTO','Cubierto']].forEach(function(pair){
        hF+='<button class="fbtn'+(pair[0]===''?' on':'')+'" onclick="filtrarR5C_sema(this,\''+pair[0]+'\');">'+pair[1]+'</button>';
      });
      rowF.innerHTML=hF;
    }

    window._r5cliNombre=nombre;
    window._r5cliSema='';
    renderTablaR5Cli(cli, '');

    const cnt=document.getElementById('r5-cli-count');
    if(cnt) cnt.textContent=cli.arts.length+' arts · '+cli.tier+' · crec. +'+Math.round(cli.factorCrec*100)+'% · surtir hoy '+cli.totalSurtibleHoy+' · pedir a proveedor '+cli.totalPendienteProv+' · '+fK(cli.totalInversion);

    if(window.buildR5CliCharts) window.buildR5CliCharts(nombre);
    const btnExp=document.getElementById('btn-exp-r5-cli');
    if(btnExp) btnExp.style.display='flex';
  };

  // MEJORA 4 — Ficha ejecutiva
  function renderResumenEjecutivo(cli){
    const cont=document.getElementById('r5-resumen-ejecutivo'); if(!cont) return;
    const tierColor=cli.tier==='ORO'?'#b8860b':cli.tier==='PLATA'?'#708090':'#8b6914';
    const tierBg=cli.tier==='ORO'?'#fef9e7':cli.tier==='PLATA'?'#f4f6f6':'#fdf2e3';
    // Top 5 prioridades de acción (comprar/reforzar con mayor score)
    const top=cli.arts.filter(a=>a.accion!=='CUBIERTO').slice(0,5);
    let topHtml='';
    if(top.length){
      topHtml=top.map(function(a){
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:.5px solid var(--border)">'
          +'<span style="font-size:12px"><b>'+a.clave+'</b> <span style="color:var(--muted)">'+a.desc.slice(0,32)+'</span></span>'
          +'<span style="font-size:11px;white-space:nowrap">ofrecer <b style="color:var(--accent)">'+a.sugerido+'</b> · surtir hoy <b>'+(a.surtibleHoy||0)+'</b> <span class="pill '+(a.confianza==='ALTA'?'g':a.confianza==='MEDIA'?'a':'r')+'" style="font-size:9px">'+a.confianza+'</span></span>'
          +'</div>';
      }).join('');
    } else {
      topHtml='<div style="font-size:12px;color:var(--green);padding:6px 0">✓ Cliente bien cubierto — sin acciones urgentes.</div>';
    }
    cont.innerHTML=
      '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'
        +'<div style="background:'+tierBg+';color:'+tierColor+';border:1px solid '+tierColor+';border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700">Cliente '+cli.tier+'</div>'
        +'<div style="font-size:12px;color:var(--muted)">Crecimiento aplicado: <b style="color:var(--text)">+'+Math.round(cli.factorCrec*100)+'%</b></div>'
        +'<div style="font-size:12px;color:var(--muted)">A surtir hoy: <b style="color:var(--green)">'+cli.totalSurtibleHoy+' pzas</b></div>'
        +'<div style="font-size:12px;color:var(--muted)">Pedir a proveedor: <b style="color:var(--red)">'+cli.totalPendienteProv+' pzas</b></div>'
        +'<div style="font-size:12px;color:var(--muted)">Inversión: <b style="color:var(--text)">'+fK(cli.totalInversion)+'</b></div>'
      +'</div>'
      +'<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Top 5 acciones prioritarias</div>'
      +topHtml;
  }

  function renderTablaR5Cli(cli, filtroAccion){
    const div=document.getElementById('tabla-r5-cli'); if(!div) return;
    let arts=cli.arts;
    if(filtroAccion) arts=arts.filter(a=>a.accion===filtroAccion);
    const mostrar=arts;

    let h='<table><thead><tr>'
      +'<th>#</th><th>Clave</th><th>Descripción</th><th>Línea</th>'
      +'<th>Score</th><th>Conf.</th><th>Uds/per.</th><th>Sugerido</th><th>Stock</th>'
      +'<th>A surtir</th><th>Surtir hoy</th><th>Pedir prov.</th><th>Precio</th><th>Inversión</th><th>Acción</th>'
      +'</tr></thead><tbody>';
    if(!mostrar.length) h+='<tr><td colspan="15" style="text-align:center;color:var(--muted)">Sin artículos con este filtro.</td></tr>';
    mostrar.forEach(function(a,i){
      var acls=a.accion==='COMPRAR'?'sema-r':a.accion==='REFORZAR'?'sema-a':'sema-v';
      var scCls=a.score>=7?'g':a.score>=4?'a':'r';
      var cfCls=a.confianza==='ALTA'?'g':a.confianza==='MEDIA'?'a':'r';
      var rowBg=a.accion==='COMPRAR'?'background:rgba(226,75,74,0.05)':a.accion==='REFORZAR'?'background:rgba(212,172,13,0.04)':'';
      var compMark=a.competido?' <span title="Stock compartido entre clientes" style="color:var(--amber);font-size:9px">⚠</span>':'';
      h+='<tr style="'+rowBg+'">'
        +'<td style="text-align:center;color:var(--muted);font-size:10px">'+(i+1)+'</td>'
        +'<td style="font-size:11px">'+a.clave+'</td>'
        +'<td style="max-width:160px;font-size:11px;overflow:hidden;text-overflow:ellipsis">'+a.desc+'</td>'
        +'<td style="font-size:10px"><span class="pill b">'+a.linea+'</span></td>'
        +'<td style="text-align:center"><span class="pill '+scCls+'">'+a.score+'</span></td>'
        +'<td style="text-align:center"><span class="pill '+cfCls+'" style="font-size:9px">'+a.confianza+'</span></td>'
        +'<td style="text-align:center;font-size:11px">'+a.uds+'</td>'
        +'<td style="text-align:center;font-weight:700;color:var(--accent);font-size:12px">'+a.sugerido+'</td>'
        +'<td style="text-align:center;font-weight:600">'+a.exist+'</td>'
        +'<td style="text-align:center;font-weight:700;color:'+(a.aReforzar>0?'var(--red)':'var(--muted)')+'">'+a.aReforzar+'</td>'
        +'<td style="text-align:center;font-weight:700;color:var(--green)">'+(a.surtibleHoy||0)+compMark+'</td>'
        +'<td style="text-align:center;font-weight:600;color:'+((a.pendienteProv||0)>0?'var(--red)':'var(--muted)')+'">'+(a.pendienteProv||0)+'</td>'
        +'<td class="col-precio" style="font-size:10px">'+(a.precio>0?'$'+a.precio:'—')+'</td>'
        +'<td class="col-valor" style="font-size:11px"><span class="pill inv">'+(a.inversion>0?fK(a.inversion):'—')+'</span></td>'
        +'<td style="text-align:center"><span class="pill '+acls+'">'+a.accion+'</span></td>'
        +'</tr>';
    });
    div.innerHTML=h+'</tbody></table>';
  }

  window.filtrarR5C_sema=function(btn,v){
    document.querySelectorAll('#r5-filtros-cli .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    window._r5cliSema=v;
    const r5=window.RB.r5; if(!r5) return;
    const cli=r5.porCliente.find(c=>c.nombre===window._r5cliNombre);
    if(cli) renderTablaR5Cli(cli, v);
  };

  /* ══ BÚSQUEDA ══════════════════════════ */
  window.buscarArticulo=function(){
    const q=(document.getElementById('search-input')?document.getElementById('search-input').value:'').toUpperCase();
    const linea=document.getElementById('search-linea')?document.getElementById('search-linea').value:'';
    const {inv,catalogo,inactivos,precioMap}=window.RB;
    const div=document.getElementById('tabla-busqueda'); if(!div) return;
    if(q.length<2&&!linea){div.innerHTML='<p style="color:var(--muted);font-size:12px;padding:10px">Escribe al menos 2 caracteres.</p>';return;}
    const res=Object.entries(inv).filter(function(e){
      const k=e[0],v=e[1];
      const cat=catalogo[k]||{};
      const mQ=!q||(k.toUpperCase().includes(q)||(cat.desc||'').toUpperCase().includes(q));
      const mL=!linea||cat.linea===linea;
      return mQ&&mL&&v.exist>0;
    }).slice(0,200);
    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Existencia</th><th>Precio unit.</th><th>Estatus</th></tr></thead><tbody>';
    if(!res.length) h+='<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    res.forEach(function(e){
      const k=e[0],v=e[1];
      const cat=catalogo[k]||{};
      const isIna=inactivos.has(k);
      const precio=precioMap[k]||0;
      h+='<tr><td>'+k+'</td><td style="max-width:300px">'+(cat.desc||'')+'</td>'
        +'<td><span class="pill b">'+(cat.linea||'')+'</span></td>'
        +'<td style="text-align:center">'+v.exist+'</td>'
        +'<td class="col-precio">'+(precio>0?'<span class="pill precio">$'+precio+'</span>':'—')+'</td>'
        +'<td><span class="pill '+(isIna?'r':'g')+'">'+(isIna?'Inactivo':'Activo')+'</span></td></tr>';
    });
    div.innerHTML=h+'</tbody></table>';
  };

  function buildBuscadorLineas(){
    const sel=document.getElementById('search-linea'); if(!sel) return;
    const lineas=[...new Set(Object.values(window.RB.catalogo).map(v=>v.linea).filter(Boolean))].sort();
    lineas.forEach(function(l){const o=document.createElement('option');o.value=l;o.textContent=l;sel.appendChild(o);});
  }

  /* ══ NAVEGACIÓN ════════════════════════ */
  window.showPage=function(id,el){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    var pg=document.getElementById('page-'+id);
    if(pg) pg.classList.add('active');
    if(el) el.classList.add('active');
    if(!built[id]){
      built[id]=true;
      if(id==='resumen'){ buildTablaResumen(); window.buildConsolidado&&window.buildConsolidado(); }
      if(id==='busqueda'){ buildBuscadorLineas(); }
      if(id==='r5'){ window.buildR5GlobalView&&window.buildR5GlobalView(); window.buildR5KPIs&&window.buildR5KPIs(); }
    }
    // Al (re)entrar a R5, redibujar la gráfica de la vista visible (canvas ya con tamaño)
    if(id==='r5'){
      setTimeout(function(){
        var vistaCli=document.getElementById('r5-view-cliente');
        var sel=document.getElementById('sel-cliente-r5');
        if(vistaCli && vistaCli.classList.contains('on') && sel && sel.value){
          if(window.buildR5CliCharts) window.buildR5CliCharts(sel.value);
        } else if(window.buildR5Charts){
          window.buildR5Charts();
        }
      }, 80);
    }
  };

  /* ══ INIT ══════════════════════════════ */
  document.addEventListener('rbready',function(){
    buildHeader();
    buildKPIs();
    buildClienteSelector('sel-cliente-r1', window.onClienteR1);
    buildClienteSelector('sel-cliente-r2', window.onClienteR2);
    buildClienteSelector('sel-cliente-r3', window.onClienteR3);
    buildClienteSelector('sel-cliente-r4', window.onClienteR4);
    buildClienteSelector('sel-cliente-r5', window.onClienteR5);
    window.RB._r2pct=20;
    built.dashboard=true;
    // Dashboard charts
    if(window.buildDashboard) window.buildDashboard();
  });
})();
