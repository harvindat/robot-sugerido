/* ══════════════════════════════════════════════
   ui.js  —  KPIs, tablas, filtros, navegación
   ══════════════════════════════════════════════ */
(function(){
  const fN=v=>v===null||isNaN(v)?'—':(v<0?'-':'')+'$'+Math.abs(Math.round(v)).toLocaleString('es-MX');
  const fK=v=>{if(!v&&v!==0)return'—';const a=Math.abs(v),s=v<0?'-':'';return a>=1e6?s+'$'+(a/1e6).toFixed(2)+'M':a>=1e3?s+'$'+(a/1e3).toFixed(0)+'K':s+'$'+a.toFixed(0)};
  const built={};

  /* ── Header ────────────────────────────────── */
  function buildHeader(){
    const {kpis,clientes} = window.RB;
    document.getElementById('hdr-clientes').innerHTML='Clientes: <b>'+clientes.length+'</b>';
    document.getElementById('hdr-ventas').innerHTML='Ventas: <b>'+fK(kpis.ventaTotal)+'</b>';
    document.getElementById('hdr-arts').innerHTML='Arts. almacén: <b>'+kpis.totalArts.toLocaleString()+'</b>';
  }

  /* ── KPIs Dashboard ────────────────────────── */
  function buildKPIs(){
    const {kpis,r1,r2,r3} = window.RB;
    const g = document.getElementById('kpi-dash');
    if(!g) return;
    const totalR3piezas = r3.reduce((s,c)=>s+c.totalPiezas,0);
    const cards=[
      {cls:'blue',  icon:'💰', lbl:'Ventas Totales',     val:fK(kpis.ventaTotal),     sub:'Ene–May 2026',      pill:'info',  pt:'Período'},
      {cls:'green', icon:'📦', lbl:'Artículos c/Stock',  val:kpis.artsConStock.toLocaleString(), sub:'de '+kpis.totalArts.toLocaleString()+' en catálogo', pill:'up', pt:'Activos'},
      {cls:'red',   icon:'🚫', lbl:'Artículos Inactivos',val:kpis.inactivosN.toLocaleString(), sub:'Sin rotación (INA)', pill:'down', pt:'Excluidos'},
      {cls:'amber', icon:'🔄', lbl:'Rotación Almacén',   val:kpis.rotPct+'%',         sub:'Uds vendidas / stock',pill:'warn',  pt:'Índice'},
      {cls:'purple',icon:'📋', lbl:'Sugeridos R1',       val:kpis.sugerR1.toLocaleString(), sub:'Por líneas compradas', pill:'info',  pt:'Arts.'},
      {cls:'cyan',  icon:'⭐', lbl:'Sugeridos R2',       val:'<span id="r2-kpi-val">'+kpis.sugerR2.toLocaleString()+'</span>', sub:'<span id="r2-kpi-sub">Top 20% rotación</span>',    pill:'info',  pt:'Arts.'},
      {cls:'green', icon:'🆕', lbl:'Piezas R3 (20%)',    val:totalR3piezas.toLocaleString(), sub:'Líneas no trabajadas', pill:'up', pt:'Piezas'},
      {cls:'blue',  icon:'👥', lbl:'Clientes Analizados',val:window.RB.clientes.length, sub:'Con historial de compra',pill:'info',  pt:'Total'},
    ];
    g.innerHTML=cards.map(c=>`
      <div class="kpi ${c.cls}">
        <div class="kpi-lbl">${c.icon} ${c.lbl}</div>
        <div class="kpi-val">${c.val}</div>
        <div class="kpi-sub">${c.sub}</div>
        <span class="kpi-pill ${c.pill}">${c.pt}</span>
      </div>`).join('');
  }

  /* ── Tabla resumen clientes ────────────────── */
  function buildTablaResumen(){
    const {clientes,r1,r2,r3} = window.RB;
    const div = document.getElementById('tabla-resumen');
    if(!div) return;
    let h='<table><thead><tr><th>Cliente</th><th>Ventas $</th><th>Arts.</th><th>Líneas</th><th>Sug. R1</th><th>Sug. R2</th><th>Líneas Faltantes</th><th>Piezas R3</th></tr></thead><tbody>';
    const sorted=[...clientes].sort((a,b)=>b.ventaTotal-a.ventaTotal);
    sorted.forEach(cli=>{
      const cr1=r1.find(x=>x.nombre===cli.nombre)||{};
      const cr2=r2.find(x=>x.nombre===cli.nombre)||{};
      const cr3=r3.find(x=>x.nombre===cli.nombre)||{};
      h+=`<tr>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${cli.nombre}</td>
        <td>${fK(cli.ventaTotal)}</td>
        <td>${cli.arts.length}</td>
        <td>${cr1.lineasCompra?.length||0}</td>
        <td><span class="pill b">${cr1.sugeridos?.length||0}</span></td>
        <td><span class="pill p">${cr2.sugeridos?.length||0}</span></td>
        <td>${cr3.lineasFaltantes?.length||0}</td>
        <td><span class="pill a">${cr3.totalPiezas||0}</span></td>
      </tr>`;
    });
    h+='</tbody></table>';
    div.innerHTML=h;
  }

  /* ── Selector de cliente ───────────────────── */
  function buildClienteSelector(selectId, onChange){
    const sel = document.getElementById(selectId);
    if(!sel) return;
    sel.innerHTML='<option value="">— Selecciona cliente —</option>';
    window.RB.clientes.forEach(c=>{
      sel.innerHTML+=`<option value="${c.nombre}">${c.nombre}</option>`;
    });
    sel.onchange=()=>onChange(sel.value);
  }

  /* ── Tabla R1 cliente ──────────────────────── */
  function buildTablaR1(nombre, filtroLinea=''){
    const {r1} = window.RB;
    const cli  = r1.find(c=>c.nombre===nombre);
    const div  = document.getElementById('tabla-r1');
    if(!div||!cli) return;

    let sug = cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);

    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Existencia</th></tr></thead><tbody>';
    if(!sug.length){ h+='<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>'; }
    sug.forEach(a=>{
      h+=`<tr><td>${a.clave}</td><td style="max-width:320px">${a.desc}</td>
          <td><span class="pill b">${a.linea}</span></td>
          <td style="text-align:center">${a.exist}</td></tr>`;
    });
    h+='</tbody></table>';
    div.innerHTML=h;
    document.getElementById('r1-count').textContent=`${sug.length} artículos sugeridos`;
  }

  function buildFiltroLineaR1(nombre){
    const {r1}=window.RB;
    const cli=r1.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r1');
    if(!row||!cli) return;
    const lineas=[...new Set(cli.sugeridos.map(a=>a.linea))].sort();
    row.innerHTML=`<span class="filter-lbl">Línea:</span>
      <button class="fbtn on" onclick="filtrarR1('',this)">Todas</button>`
      +lineas.map(l=>`<button class="fbtn" onclick="filtrarR1('${l}',this)">${l}</button>`).join('');
  }

  window.filtrarR1=function(linea,btn){
    document.querySelectorAll('#filtro-linea-r1 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const sel=document.getElementById('sel-cliente-r1');
    buildTablaR1(sel?.value||'',linea);
  };

  /* ── Tabla R2 cliente ──────────────────────── */
  function buildTablaR2(nombre, filtroLinea=''){
    const {r2}=window.RB;
    const cli=r2.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r2');
    if(!div||!cli) return;

    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);

    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Existencia</th><th>Score Rot.</th><th>Rank</th><th>Uds Vendidas</th></tr></thead><tbody>';
    if(!sug.length){ h+='<tr><td colspan="7" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>'; }
    sug.forEach(a=>{
      const scls=a.score>=7?'g':a.score>=4?'a':'r';
      h+=`<tr><td>${a.clave}</td><td style="max-width:280px">${a.desc}</td>
          <td><span class="pill p">${a.linea}</span></td>
          <td style="text-align:center">${a.exist}</td>
          <td style="text-align:center"><span class="pill ${scls}">${a.score}</span></td>
          <td style="text-align:center">#${a.rank}</td>
          <td style="text-align:center">${a.udsTotal}</td></tr>`;
    });
    h+='</tbody></table>';
    div.innerHTML=h;
    const pct=window.RB._r2pct||20;
    document.getElementById('r2-count').textContent=`${sug.length} artículos · top ${pct}% rotación`;
  }

  function buildFiltroLineaR2(nombre){
    const {r2}=window.RB;
    const cli=r2.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r2');
    if(!row||!cli) return;
    const lineas=[...new Set(cli.sugeridos.map(a=>a.linea))].sort();
    row.innerHTML=`<span class="filter-lbl">Línea:</span>
      <button class="fbtn on" onclick="filtrarR2('',this)">Todas</button>`
      +lineas.map(l=>`<button class="fbtn" onclick="filtrarR2('${l}',this)">${l}</button>`).join('');
  }

  window.filtrarR2=function(linea,btn){
    document.querySelectorAll('#filtro-linea-r2 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const sel=document.getElementById('sel-cliente-r2');
    buildTablaR2(sel?.value||'',linea);
  };

  window.recalcularR2=function(pct){
    const pctNum=parseInt(pct)||20;
    window.RB._r2pct=pctNum;
    document.getElementById('r2-pct-val').textContent=pctNum+'%';
    // Recalcular usando el parser
    const {inv,catalogo,inactivos,clientes}=window.RB;
    const rotMap={};
    clientes.forEach(cli=>cli.arts.forEach(a=>{rotMap[a.clave]=(rotMap[a.clave]||0)+a.uds;}));
    const sorted=Object.entries(rotMap).sort((a,b)=>b[1]-a[1]);
    const topN=Math.ceil(sorted.length*(pctNum/100));
    const topSet=new Set(sorted.slice(0,topN).map(x=>x[0]));
    const activos=new Set(Object.keys(inv).filter(k=>inv[k].exist>0&&!inactivos.has(k)));
    const sugeribles=[...topSet].filter(k=>activos.has(k));
    const maxRot=sorted[0]?.[1]||1;
    const scoreMap={};
    sorted.forEach(([k,v],i)=>{scoreMap[k]={score:+(v/maxRot*10).toFixed(1),rank:i+1,uds:v};});
    // Reconstruir r2
    window.RB.r2=clientes.map(cli=>{
      const compradas=new Set(cli.arts.map(a=>catalogo[a.clave]?.linea).filter(Boolean));
      const ya=new Set(cli.arts.map(a=>a.clave));
      const sug=sugeribles.filter(k=>{const l=catalogo[k]?.linea;return l&&compradas.has(l)&&!ya.has(k);})
        .map(k=>({clave:k,desc:catalogo[k].desc,linea:catalogo[k].linea,exist:inv[k].exist,
          score:scoreMap[k]?.score||0,rank:scoreMap[k]?.rank||0,udsTotal:rotMap[k]||0}))
        .sort((a,b)=>b.score-a.score);
      return {nombre:cli.nombre,ventaTotal:cli.ventaTotal,lineasCompra:[...compradas],sugeridos:sug};
    });
    // Actualizar KPI
    const totalSugR2=window.RB.r2.reduce((s,c)=>s+c.sugeridos.length,0);
    document.getElementById('r2-kpi-val').textContent=totalSugR2.toLocaleString();
    document.getElementById('r2-kpi-sub').textContent='Top '+pctNum+'% rotación';
    // Re-render si hay cliente activo
    const sel=document.getElementById('sel-cliente-r2');
    if(sel?.value){
      buildFiltroLineaR2(sel.value);
      buildTablaR2(sel.value,'');
      if(window.buildR2Charts) window.buildR2Charts(sel.value);
    }
  };

  /* ── Tabla R3 cliente ──────────────────────── */
  function buildTablaR3(nombre, filtroLinea=''){
    const {r3}=window.RB;
    const cli=r3.find(c=>c.nombre===nombre);
    const div=document.getElementById('tabla-r3');
    if(!div||!cli) return;

    let sug=cli.sugeridos;
    if(filtroLinea) sug=sug.filter(a=>a.linea===filtroLinea);

    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Existencia</th><th>Sugerido 20%</th></tr></thead><tbody>';
    if(!sug.length){ h+='<tr><td colspan="5" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>'; }
    sug.forEach(a=>{
      h+=`<tr><td>${a.clave}</td><td style="max-width:300px">${a.desc}</td>
          <td><span class="pill a">${a.linea}</span></td>
          <td style="text-align:center">${a.exist}</td>
          <td style="text-align:center;font-weight:600;color:var(--amber)">${a.sug20}</td></tr>`;
    });
    h+='</tbody></table>';
    div.innerHTML=h;
    document.getElementById('r3-count').textContent=`${sug.length} artículos | ${cli.sugeridos.reduce((s,a)=>s+a.sug20,0)} piezas sugeridas`;
  }

  function buildFiltroLineaR3(nombre){
    const {r3}=window.RB;
    const cli=r3.find(c=>c.nombre===nombre);
    const row=document.getElementById('filtro-linea-r3');
    if(!row||!cli) return;
    const lineas=cli.lineasFaltantes.sort();
    row.innerHTML=`<span class="filter-lbl">Línea nueva:</span>
      <button class="fbtn on" onclick="filtrarR3('',this)">Todas</button>`
      +lineas.map(l=>`<button class="fbtn" onclick="filtrarR3('${l}',this)">${l}</button>`).join('');
  }

  window.filtrarR3=function(linea,btn){
    document.querySelectorAll('#filtro-linea-r3 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const sel=document.getElementById('sel-cliente-r3');
    buildTablaR3(sel?.value||'',linea);
  };

  /* ── Búsqueda global de artículo ────────────── */
  window.buscarArticulo=function(){
    const q=(document.getElementById('search-input')?.value||'').toUpperCase();
    const linea=document.getElementById('search-linea')?.value||'';
    const {inv,catalogo,inactivos}=window.RB;
    const div=document.getElementById('tabla-busqueda');
    if(!div) return;

    if(q.length<2&&!linea){ div.innerHTML='<p style="color:var(--muted);font-size:12px;padding:10px">Escribe al menos 2 caracteres para buscar.</p>'; return; }

    const resultados=Object.entries(inv).filter(([k,v])=>{
      const cat=catalogo[k]||{};
      const matchQ=!q||(k.toUpperCase().includes(q)||cat.desc?.toUpperCase().includes(q));
      const matchL=!linea||cat.linea===linea;
      return matchQ&&matchL&&v.exist>0;
    }).slice(0,200);

    let h='<table><thead><tr><th>Clave</th><th>Descripción</th><th>Línea</th><th>Existencia</th><th>Estatus</th></tr></thead><tbody>';
    if(!resultados.length){ h+='<tr><td colspan="5" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>'; }
    resultados.forEach(([k,v])=>{
      const cat=catalogo[k]||{};
      const isIna=inactivos.has(k);
      h+=`<tr><td>${k}</td><td style="max-width:320px">${cat.desc||''}</td>
          <td><span class="pill b">${cat.linea||''}</span></td>
          <td style="text-align:center">${v.exist}</td>
          <td><span class="pill ${isIna?'r':'g'}">${isIna?'Inactivo':'Activo'}</span></td></tr>`;
    });
    h+='</tbody></table>';
    div.innerHTML=h;
  };

  function buildBuscadorLineas(){
    const sel=document.getElementById('search-linea');
    if(!sel) return;
    const lineas=[...new Set(Object.values(window.RB.catalogo).map(v=>v.linea).filter(Boolean))].sort();
    lineas.forEach(l=>{ sel.innerHTML+=`<option value="${l}">${l}</option>`; });
  }

  /* ── Navegación ─────────────────────────────── */
  window.showPage=function(id,el){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('page-'+id)?.classList.add('active');
    if(el) el.classList.add('active');

    if(!built[id]){
      built[id]=true;
      if(id==='resumen'){ buildTablaResumen(); window.buildConsolidado(); }
      if(id==='busqueda'){ buildBuscadorLineas(); }
    }
  };

  /* ── Cambio de cliente ──────────────────────── */
  window.onClienteR1=function(n){
    if(!n) return;
    buildFiltroLineaR1(n);
    buildTablaR1(n);
    window.buildR1Charts(n);
  };
  window.onClienteR2=function(n){
    if(!n) return;
    buildFiltroLineaR2(n);
    buildTablaR2(n);
    window.buildR2Charts(n);
  };
  window.onClienteR3=function(n){
    if(!n) return;
    buildFiltroLineaR3(n);
    buildTablaR3(n);
    window.buildR3Charts(n);
  };


  /* ── Tabla R4 cliente ──────────────────────── */
  function buildTablaR4(nombre, filtroLinea='', filtroAlerta=''){
    const {r4} = window.RB;
    const cli  = r4.find(c=>c.nombre===nombre);
    const div  = document.getElementById('tabla-r4');
    if(!div||!cli) return;

    let arts = cli.arts;
    if(filtroLinea)  arts = arts.filter(a=>a.linea===filtroLinea);
    if(filtroAlerta) arts = arts.filter(a=>a.alertaStock===filtroAlerta);

    let h='<table><thead><tr><th>Rank</th><th>Clave</th><th>Descripción</th><th>Línea</th>'
      +'<th>Uds Compradas</th><th>Venta $</th><th>Score</th><th>Stock Actual</th>'
      +'<th>Stock Sug. (1.5x)</th><th>Alerta</th></tr></thead><tbody>';

    if(!arts.length){ h+='<tr><td colspan="10" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>'; }

    arts.forEach((a,i)=>{
      const ev=i%2===0;
      const scCls=a.score>=7?'g':a.score>=4?'a':'r';
      const alCls=a.alertaStock==='BAJO'?'r':a.alertaStock==='MEDIO'?'a':'g';
      const rowBg=a.alertaStock==='BAJO'?'background:rgba(192,57,43,0.06)':
                  a.alertaStock==='MEDIO'?'background:rgba(212,172,13,0.05)':'';
      h+=`<tr style="${rowBg}">
        <td style="text-align:center;color:var(--muted);font-size:10px">#${i+1}</td>
        <td>${a.clave}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis">${a.desc}</td>
        <td><span class="pill b">${a.linea||'—'}</span></td>
        <td style="text-align:center;font-weight:600">${a.uds}</td>
        <td>$${Math.round(a.venta).toLocaleString('es-MX')}</td>
        <td style="text-align:center"><span class="pill ${scCls}">${a.score}</span></td>
        <td style="text-align:center;font-weight:600;color:${a.alertaStock==='BAJO'?'var(--red)':a.alertaStock==='MEDIO'?'var(--amber)':'var(--green)'}">${a.stock}</td>
        <td style="text-align:center;font-weight:700;color:var(--green)">${a.stockSugerido}</td>
        <td style="text-align:center"><span class="pill ${alCls}">${a.alertaStock}</span></td>
      </tr>`;
    });
    h+='</tbody></table>';
    div.innerHTML=h;
    document.getElementById('r4-count').textContent=
      `${arts.length} artículos · Score prom: ${arts.length?+(arts.reduce((s,a)=>s+a.score,0)/arts.length).toFixed(1):0} · ⚠️ ${cli.alertasBajo} críticos · 🔔 ${cli.alertasMedio} medios`;
  }

  function buildFiltrosR4(nombre){
    const {r4}=window.RB;
    const cli=r4.find(c=>c.nombre===nombre);
    if(!cli) return;

    // Filtro líneas
    const lineas=[...new Set(cli.arts.map(a=>a.linea).filter(Boolean))].sort();
    const rowL=document.getElementById('filtro-linea-r4');
    rowL.innerHTML='<span class="filter-lbl">Línea:</span>'
      +'<button class="fbtn on" onclick="filtrarR4L('',this)">Todas</button>'
      +lineas.map(l=>`<button class="fbtn" onclick="filtrarR4L('${l}',this)">${l}</button>`).join('');

    // Filtro alerta
    const rowA=document.getElementById('filtro-alerta-r4');
    rowA.innerHTML='<span class="filter-lbl">Alerta stock:</span>'
      +'<button class="fbtn on" onclick="filtrarR4A('',this)">Todas</button>'
      +'<button class="fbtn" onclick="filtrarR4A('BAJO',this)" style="border-color:#c0392b;color:#c0392b">🔴 BAJO</button>'
      +'<button class="fbtn" onclick="filtrarR4A('MEDIO',this)" style="border-color:#d4ac0d;color:#d4ac0d">🟡 MEDIO</button>'
      +'<button class="fbtn" onclick="filtrarR4A('OK',this)" style="border-color:#27ae60;color:#27ae60">🟢 OK</button>';
  }

  let _r4linea='', _r4alerta='';
  window.filtrarR4L=function(l,btn){
    document.querySelectorAll('#filtro-linea-r4 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on'); _r4linea=l;
    const sel=document.getElementById('sel-cliente-r4');
    buildTablaR4(sel?.value||'',_r4linea,_r4alerta);
  };
  window.filtrarR4A=function(a,btn){
    document.querySelectorAll('#filtro-alerta-r4 .fbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on'); _r4alerta=a;
    const sel=document.getElementById('sel-cliente-r4');
    buildTablaR4(sel?.value||'',_r4linea,_r4alerta);
  };

  window.onClienteR4=function(n){
    if(!n) return;
    _r4linea=''; _r4alerta='';
    buildFiltrosR4(n);
    buildTablaR4(n,'','');
    if(window.buildR4Charts) window.buildR4Charts(n);
    const btn=document.getElementById('btn-exp-r4');
    if(btn) btn.style.display='flex';
  };

  /* ── Init ───────────────────────────────────── */
  document.addEventListener('rbready',()=>{
    buildHeader();
    buildKPIs();
    buildClienteSelector('sel-cliente-r1', window.onClienteR1);
    buildClienteSelector('sel-cliente-r2', window.onClienteR2);
    buildClienteSelector('sel-cliente-r3', window.onClienteR3);
    buildClienteSelector('sel-cliente-r4', window.onClienteR4);
    built.dashboard=true;
  });
})();
