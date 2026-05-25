/* ══════════════════════════════════════════════
   ui.js  —  KPIs, tablas, filtros, navegacion
   ══════════════════════════════════════════════ */
(function(){
  const fN=v=>v===null||isNaN(v)?'—':(v<0?'-':'')+'$'+Math.abs(Math.round(v)).toLocaleString('es-MX');
  const fK=v=>{if(!v&&v!==0)return'—';const a=Math.abs(v),s=v<0?'-':'';return a>=1e6?s+'$'+(a/1e6).toFixed(2)+'M':a>=1e3?s+'$'+(a/1e3).toFixed(0)+'K':s+'$'+a.toFixed(0)};
  const built={};

  /* ── Header ─────────────────────────────── */
  function buildHeader(){
    const {kpis,clientes}=window.RB;
    document.getElementById('hdr-clientes').innerHTML='Clientes: <b>'+clientes.length+'</b>';
    document.getElementById('hdr-ventas').innerHTML='Ventas: <b>'+fK(kpis.ventaTotal)+'</b>';
    document.getElementById('hdr-arts').innerHTML='Arts. almacen: <b>'+kpis.totalArts.toLocaleString()+'</b>';
  }

  /* ── KPIs Dashboard ───────────────────── */
  function buildKPIs(){
    const {kpis,r1,r2,r3}=window.RB;
    const g=document.getElementById('kpi-dash');
    if(!g) return;
    const totalR3=r3.reduce((s,c)=>s+c.totalPiezas,0);
    const cards=[
      {cls:'blue',  lbl:'Ventas Totales',     val:fK(kpis.ventaTotal),                   sub:'Periodo',                  pill:'info', pt:'Total'},
      {cls:'green', lbl:'Arts. con Stock',     val:kpis.artsConStock.toLocaleString(),     sub:'de '+kpis.totalArts.toLocaleString(), pill:'up',   pt:'Activos'},
      {cls:'red',   lbl:'Inactivos',           val:kpis.inactivosN.toLocaleString(),       sub:'Sin rotacion',             pill:'down', pt:'INA'},
      {cls:'amber', lbl:'Rotacion Almacen',    val:kpis.rotPct+'%',                        sub:'Uds / stock',              pill:'warn', pt:'Indice'},
      {cls:'purple',lbl:'Sugeridos R1',        val:kpis.sugerR1.toLocaleString(),          sub:'Por lineas compradas',      pill:'info', pt:'Arts.'},
      {cls:'cyan',  lbl:'Sugeridos R2',        val:'<span id="r2-kpi-val">'+kpis.sugerR2.toLocaleString()+'</span>', sub:'Top 20% rotacion', pill:'info', pt:'Arts.'},
      {cls:'green', lbl:'Piezas R3',           val:totalR3.toLocaleString(),               sub:'Lineas no trabajadas',      pill:'up',   pt:'Piezas'},
      {cls:'blue',  lbl:'Clientes',            val:window.RB.clientes.length,              sub:'Con historial',             pill:'info', pt:'Total'},
    ];
    g.innerHTML=cards.map(c=>'<div class="kpi '+c.cls+'"><div class="kpi-lbl">'+c.lbl+'</div><div class="kpi-val">'+c.val+'</div><div class="kpi-sub">'+c.sub+'</div><span class="kpi-pill '+c.pill+'">'+c.pt+'</span></div>').join('');
  }

  /* ── Tabla resumen ────────────────────── */
  function buildTablaResumen(){
    const {clientes,r1,r2,r3}=window.RB;
    const div=document.getElementById('tabla-resumen');
    if(!div) return;
    let h='<table><thead><tr><th>Cliente</th><th>Ventas $</th><th>Arts.</th><th>Lineas</th><th>Sug. R1</th><th>Sug. R2</th><th>Lin. Falt.</th><th>Piezas R3</th></tr></thead><tbody>';
    [...clientes].sort((a,b)=>b.ventaTotal-a.ventaTotal).forEach(cli=>{
      const cr1=r1.find(x=>x.nombre===cli.nombre)||{};
      const cr2=r2.find(x=>x.nombre===cli.nombre)||{};
      const cr3=r3.find(x=>x.nombre===cli.nombre)||{};
      h+='<tr><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">'+cli.nombre+'</td>'
        +'<td>'+fK(cli.ventaTotal)+'</td>'
        +'<td>'+cli.arts.length+'</td>'
        +'<td>'+(cr1.lineasCompra?cr1.lineasCompra.length:0)+'</td>'
        +'<td><span class="pill b">'+(cr1.sugeridos?cr1.sugeridos.length:0)+'</span></td>'
        +'<td><span class="pill p">'+(cr2.sugeridos?cr2.sugeridos.length:0)+'</span></td>'
        +'<td>'+(cr3.lineasFaltantes?cr3.lineasFaltantes.length:0)+'</td>'
        +'<td><span class="pill a">'+(cr3.totalPiezas||0)+'</span></td></tr>';
    });
    div.innerHTML=h+'</tbody></table>';
  }

  /* ── Selector de cliente ─────────────── */
  function buildClienteSelector(selectId, onChange){
    const sel=document.getElementById(selectId);
    if(!sel) return;
    sel.innerHTML='<option value="">— Selecciona cliente —</option>';
    window.RB.clientes.forEach(c=>{
      const opt=document.createElement('option');
      opt.value=c.nombre; opt.textContent=c.nombre;
      sel.appendChild(opt);
    });
    sel.onchange=function(){ onChange(sel.value); };
  }

  /* ══ R1 ══════════════════════════════ */
  function buildTablaR1(nombre, filtroLinea){
    filtroLinea=filtroLinea||'';
    const {r1}=window.RB;
    const cli=r1.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r1');
    if(!div||!cli) return;
    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);
    let h='<table><thead><tr><th>Clave</th><th>Descripcion</th><th>Linea</th><th>Existencia</th></tr></thead><tbody>';
    if(!sug.length) h+='<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    sug.forEach(a=>{
      h+='<tr><td>'+a.clave+'</td><td style="max-width:320px">'+a.desc+'</td>'
        +'<td><span class="pill b">'+a.linea+'</span></td>'
        +'<td style="text-align:center">'+a.exist+'</td></tr>';
    });
    div.innerHTML=h+'</tbody></table>';
    document.getElementById('r1-count').textContent=sug.length+' articulos sugeridos';
  }

  function buildFiltroR1(nombre){
    const {r1}=window.RB;
    const cli=r1.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r1');
    if(!row||!cli) return;
    const lineas=[...new Set(cli.sugeridos.map(a=>a.linea))].sort();
    let h='<span class="filter-lbl">Linea:</span><button class="fbtn on" onclick="filtrarR1(this,\'\')">Todas</button>';
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
    buildFiltroR1(n);
    buildTablaR1(n,'');
    if(window.buildR1Charts) window.buildR1Charts(n);
    const btn=document.getElementById('btn-exp-r1');
    if(btn) btn.style.display='flex';
  };

  /* ══ R2 ══════════════════════════════ */
  function buildTablaR2(nombre, filtroLinea){
    filtroLinea=filtroLinea||'';
    const {r2}=window.RB;
    const cli=r2.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r2');
    if(!div||!cli) return;
    const pct=window.RB._r2pct||20;
    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);
    let h='<table><thead><tr><th>Clave</th><th>Descripcion</th><th>Linea</th><th>Existencia</th><th>Score</th><th>Rank</th><th>Uds</th></tr></thead><tbody>';
    if(!sug.length) h+='<tr><td colspan="7" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    sug.forEach(a=>{
      const scls=a.score>=7?'g':a.score>=4?'a':'r';
      h+='<tr><td>'+a.clave+'</td><td style="max-width:280px">'+a.desc+'</td>'
        +'<td><span class="pill p">'+a.linea+'</span></td>'
        +'<td style="text-align:center">'+a.exist+'</td>'
        +'<td style="text-align:center"><span class="pill '+scls+'">'+a.score+'</span></td>'
        +'<td style="text-align:center">#'+a.rank+'</td>'
        +'<td style="text-align:center">'+a.udsTotal+'</td></tr>';
    });
    div.innerHTML=h+'</tbody></table>';
    document.getElementById('r2-count').textContent=sug.length+' articulos top '+pct+'% rotacion';
  }

  function buildFiltroR2(nombre){
    const {r2}=window.RB;
    const cli=r2.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r2');
    if(!row||!cli) return;
    const lineas=[...new Set(cli.sugeridos.map(a=>a.linea))].sort();
    let h='<span class="filter-lbl">Linea:</span><button class="fbtn on" onclick="filtrarR2(this,\'\')">Todas</button>';
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
    buildFiltroR2(n);
    buildTablaR2(n,'');
    if(window.buildR2Charts) window.buildR2Charts(n);
    const btn=document.getElementById('btn-exp-r2');
    if(btn) btn.style.display='flex';
    const t=document.getElementById('r2-pct-title');
    if(t) t.textContent=(window.RB._r2pct||20)+'%';
  };

  window.recalcularR2=function(pct){
    const pctNum=parseInt(pct)||20;
    window.RB._r2pct=pctNum;
    document.getElementById('r2-pct-val').textContent=pctNum+'%';
    const {inv,catalogo,inactivos,clientes}=window.RB;
    const rotMap={};
    clientes.forEach(cli=>cli.arts.forEach(a=>{rotMap[a.clave]=(rotMap[a.clave]||0)+a.uds;}));
    const sorted=Object.entries(rotMap).sort((a,b)=>b[1]-a[1]);
    const topN=Math.ceil(sorted.length*(pctNum/100));
    const topSet=new Set(sorted.slice(0,topN).map(x=>x[0]));
    const activos=new Set(Object.keys(inv).filter(k=>inv[k].exist>0&&!inactivos.has(k)));
    const sugeribles=[...topSet].filter(k=>activos.has(k));
    const maxRot=sorted[0]?sorted[0][1]:1;
    const scoreMap={};
    sorted.forEach(([k,v],i)=>{scoreMap[k]={score:+(v/maxRot*10).toFixed(1),rank:i+1,uds:v};});
    window.RB.r2=clientes.map(cli=>{
      const compradas=new Set(cli.arts.map(a=>catalogo[a.clave]?catalogo[a.clave].linea:'').filter(Boolean));
      const ya=new Set(cli.arts.map(a=>a.clave));
      const sug=sugeribles.filter(k=>{const l=catalogo[k]?catalogo[k].linea:'';return l&&compradas.has(l)&&!ya.has(k);})
        .map(k=>({clave:k,desc:catalogo[k].desc,linea:catalogo[k].linea,exist:inv[k].exist,
          score:scoreMap[k]?scoreMap[k].score:0,rank:scoreMap[k]?scoreMap[k].rank:0,udsTotal:rotMap[k]||0}))
        .sort((a,b)=>b.score-a.score);
      return {nombre:cli.nombre,ventaTotal:cli.ventaTotal,lineasCompra:[...compradas],sugeridos:sug};
    });
    const totalSugR2=window.RB.r2.reduce((s,c)=>s+c.sugeridos.length,0);
    const kv=document.getElementById('r2-kpi-val');
    if(kv) kv.textContent=totalSugR2.toLocaleString();
    const sel=document.getElementById('sel-cliente-r2');
    if(sel&&sel.value){ buildFiltroR2(sel.value); buildTablaR2(sel.value,''); if(window.buildR2Charts) window.buildR2Charts(sel.value); }
  };

  /* ══ R3 ══════════════════════════════ */
  function buildTablaR3(nombre, filtroLinea){
    filtroLinea=filtroLinea||'';
    const {r3}=window.RB;
    const cli=r3.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r3');
    if(!div||!cli) return;
    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);
    let h='<table><thead><tr><th>Clave</th><th>Descripcion</th><th>Linea</th><th>Existencia</th><th>Sugerido 20%</th></tr></thead><tbody>';
    if(!sug.length) h+='<tr><td colspan="5" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    sug.forEach(a=>{
      h+='<tr><td>'+a.clave+'</td><td style="max-width:300px">'+a.desc+'</td>'
        +'<td><span class="pill a">'+a.linea+'</span></td>'
        +'<td style="text-align:center">'+a.exist+'</td>'
        +'<td style="text-align:center;font-weight:600;color:var(--amber)">'+a.sug20+'</td></tr>';
    });
    div.innerHTML=h+'</tbody></table>';
    document.getElementById('r3-count').textContent=sug.length+' articulos | '+cli.sugeridos.reduce((s,a)=>s+a.sug20,0)+' piezas';
  }

  function buildFiltroR3(nombre){
    const {r3}=window.RB;
    const cli=r3.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r3');
    if(!row||!cli) return;
    let h='<span class="filter-lbl">Linea nueva:</span><button class="fbtn on" onclick="filtrarR3(this,\'\')">Todas</button>';
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
    buildFiltroR3(n);
    buildTablaR3(n,'');
    if(window.buildR3Charts) window.buildR3Charts(n);
    const btn=document.getElementById('btn-exp-r3');
    if(btn) btn.style.display='flex';
  };

  /* ══ R4 ══════════════════════════════ */
  function buildTablaR4(nombre, filtroLinea, filtroAlerta){
    filtroLinea=filtroLinea||''; filtroAlerta=filtroAlerta||'';
    const {r4}=window.RB;
    const cli=r4.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r4');
    if(!div||!cli) return;
    let arts=cli.arts;
    if(filtroLinea)  arts=arts.filter(a=>a.linea===filtroLinea);
    if(filtroAlerta) arts=arts.filter(a=>a.alertaStock===filtroAlerta);
    let h='<table><thead><tr><th>Rank</th><th>Clave</th><th>Descripcion</th><th>Linea</th>'
      +'<th>Uds</th><th>Venta $</th><th>Score</th><th>Stock</th><th>Sug. 1.5x</th><th>Alerta</th></tr></thead><tbody>';
    if(!arts.length) h+='<tr><td colspan="10" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    arts.forEach(function(a,i){
      var scCls=a.score>=7?'g':a.score>=4?'a':'r';
      var alCls=a.alertaStock==='BAJO'?'r':a.alertaStock==='MEDIO'?'a':'g';
      var rowBg=a.alertaStock==='BAJO'?'background:rgba(192,57,43,0.06)':a.alertaStock==='MEDIO'?'background:rgba(212,172,13,0.05)':'';
      h+='<tr style="'+rowBg+'">'
        +'<td style="text-align:center;color:var(--muted);font-size:10px">#'+(i+1)+'</td>'
        +'<td>'+a.clave+'</td>'
        +'<td style="max-width:260px;overflow:hidden;text-overflow:ellipsis">'+a.desc+'</td>'
        +'<td><span class="pill b">'+(a.linea||'—')+'</span></td>'
        +'<td style="text-align:center;font-weight:600">'+a.uds+'</td>'
        +'<td>$'+Math.round(a.venta).toLocaleString('es-MX')+'</td>'
        +'<td style="text-align:center"><span class="pill '+scCls+'">'+a.score+'</span></td>'
        +'<td style="text-align:center;font-weight:600;color:'+(a.alertaStock==='BAJO'?'var(--red)':a.alertaStock==='MEDIO'?'var(--amber)':'var(--green)')+'">'+a.stock+'</td>'
        +'<td style="text-align:center;font-weight:700;color:var(--green)">'+a.stockSugerido+'</td>'
        +'<td style="text-align:center"><span class="pill '+alCls+'">'+a.alertaStock+'</span></td>'
        +'</tr>';
    });
    div.innerHTML=h+'</tbody></table>';
    var avg=arts.length?+(arts.reduce(function(s,a){return s+a.score;},0)/arts.length).toFixed(1):0;
    document.getElementById('r4-count').textContent=arts.length+' arts \u00b7 Score prom: '+avg+' \u00b7 \u26a0\ufe0f '+cli.alertasBajo+' criticos \u00b7 \ud83d\udd14 '+cli.alertasMedio+' medios';
  }

  function buildFiltrosR4(nombre){
    const {r4}=window.RB;
    const cli=r4.find(c=>c.nombre===nombre);
    if(!cli) return;
    const lineas=[...new Set(cli.arts.map(a=>a.linea).filter(Boolean))].sort();
    const rowL=document.getElementById('filtro-linea-r4');
    let hL='<span class="filter-lbl">Linea:</span><button class="fbtn on" onclick="filtrarR4L(this,\'\')">Todas</button>';
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
    buildFiltrosR4(n);
    buildTablaR4(n,'','');
    if(window.buildR4Charts) window.buildR4Charts(n);
    var btn=document.getElementById('btn-exp-r4');
    if(btn) btn.style.display='flex';
  };

  /* ══ BUSQUEDA ════════════════════════ */
  window.buscarArticulo=function(){
    const q=(document.getElementById('search-input')?document.getElementById('search-input').value:'').toUpperCase();
    const linea=document.getElementById('search-linea')?document.getElementById('search-linea').value:'';
    const {inv,catalogo,inactivos}=window.RB;
    const div=document.getElementById('tabla-busqueda');
    if(!div) return;
    if(q.length<2&&!linea){div.innerHTML='<p style="color:var(--muted);font-size:12px;padding:10px">Escribe al menos 2 caracteres.</p>';return;}
    const res=Object.entries(inv).filter(function(e){
      const k=e[0],v=e[1];
      const cat=catalogo[k]||{};
      const mQ=!q||(k.toUpperCase().includes(q)||(cat.desc||'').toUpperCase().includes(q));
      const mL=!linea||cat.linea===linea;
      return mQ&&mL&&v.exist>0;
    }).slice(0,200);
    let h='<table><thead><tr><th>Clave</th><th>Descripcion</th><th>Linea</th><th>Existencia</th><th>Estatus</th></tr></thead><tbody>';
    if(!res.length) h+='<tr><td colspan="5" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
    res.forEach(function(e){
      const k=e[0],v=e[1];
      const cat=catalogo[k]||{};
      const isIna=inactivos.has(k);
      h+='<tr><td>'+k+'</td><td style="max-width:320px">'+(cat.desc||'')+'</td>'
        +'<td><span class="pill b">'+(cat.linea||'')+'</span></td>'
        +'<td style="text-align:center">'+v.exist+'</td>'
        +'<td><span class="pill '+(isIna?'r':'g')+'">'+(isIna?'Inactivo':'Activo')+'</span></td></tr>';
    });
    div.innerHTML=h+'</tbody></table>';
  };

  function buildBuscadorLineas(){
    const sel=document.getElementById('search-linea');
    if(!sel) return;
    const lineas=[...new Set(Object.values(window.RB.catalogo).map(v=>v.linea).filter(Boolean))].sort();
    lineas.forEach(function(l){const o=document.createElement('option');o.value=l;o.textContent=l;sel.appendChild(o);});
  }

  /* ══ CONSOLIDADO ════════════════════ */
  /* buildConsolidado esta definido en charts.js — se llama desde showPage('resumen') */

  /* ══ NAVEGACION ═════════════════════ */
  window.showPage=function(id,el){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    var pg=document.getElementById('page-'+id);
    if(pg) pg.classList.add('active');
    if(el) el.classList.add('active');
    if(!built[id]){
      built[id]=true;
      if(id==='resumen'){ buildTablaResumen(); window.buildConsolidado(); }
      if(id==='busqueda'){ buildBuscadorLineas(); }
    }
  };

  /* ══ INIT ═══════════════════════════ */
  document.addEventListener('rbready',function(){
    buildHeader();
    buildKPIs();
    buildClienteSelector('sel-cliente-r1', window.onClienteR1);
    buildClienteSelector('sel-cliente-r2', window.onClienteR2);
    buildClienteSelector('sel-cliente-r3', window.onClienteR3);
    buildClienteSelector('sel-cliente-r4', window.onClienteR4);
    window.RB._r2pct=20;
    built.dashboard=true;
  });
})();
