/* ══════════════════════════════════════════════
   export.js  —  Exportación a Excel profesional
   Depende de: window.RB, SheetJS (xlsx)
   ══════════════════════════════════════════════ */
(function(){

  /* ── Estilos de celda ─────────────────────── */
  const S = {
    titleDark: { font:{bold:true,sz:13,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'7B1C1C'}}, alignment:{horizontal:'center',vertical:'center'}, border:border() },
    titleMed:  { font:{bold:true,sz:11,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'A93226'}}, alignment:{horizontal:'center',vertical:'center'}, border:border() },
    header:    { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'C0392B'}}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border:border() },
    lineHdr:   { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'922B21'}}, alignment:{horizontal:'left',vertical:'center'}, border:border() },
    dataA:     { font:{sz:9}, fill:{fgColor:{rgb:'FDEDEC'}}, alignment:{horizontal:'left'},  border:border() },
    dataB:     { font:{sz:9}, fill:{fgColor:{rgb:'FFFFFF'}}, alignment:{horizontal:'left'},  border:border() },
    dataAC:    { font:{sz:9}, fill:{fgColor:{rgb:'FDEDEC'}}, alignment:{horizontal:'center'},border:border() },
    dataBC:    { font:{sz:9}, fill:{fgColor:{rgb:'FFFFFF'}}, alignment:{horizontal:'center'},border:border() },
    dataAR:    { font:{sz:9}, fill:{fgColor:{rgb:'FDEDEC'}}, alignment:{horizontal:'right'}, border:border() },
    dataBR:    { font:{sz:9}, fill:{fgColor:{rgb:'FFFFFF'}}, alignment:{horizontal:'right'}, border:border() },
    total:     { font:{bold:true,sz:9,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'922B21'}}, alignment:{horizontal:'center'}, border:border() },
    totalLbl:  { font:{bold:true,sz:9,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'922B21'}}, alignment:{horizontal:'right'},  border:border() },
    scoreH:    { font:{bold:true,sz:9,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center'}, border:border() },
    scoreMed:  { font:{bold:true,sz:9,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1F618D'}}, alignment:{horizontal:'center'}, border:border() },
    scoreLow:  { font:{bold:true,sz:9,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'7D6608'}}, alignment:{horizontal:'center'}, border:border() },
  };

  function border(){
    const t={style:'thin',color:{rgb:'D5DBDB'}};
    return {top:t,bottom:t,left:t,right:t};
  }

  function cell(v, s){ return {v, s, t: typeof v==='number'?'n':'s'}; }
  function merge(ws, r1,c1,r2,c2){ if(!ws['!merges']) ws['!merges']=[]; ws['!merges'].push({s:{r:r1,c:c1},e:{r:r2,c:c2}}); }
  function setCell(ws, r, c, v, s){ const ref=XLSX.utils.encode_cell({r,c}); ws[ref]=cell(v,s); }

  function autoRange(ws, maxR, maxC){
    ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:maxR,c:maxC}});
  }

  /* ═══════════════════════════════════════════
     EXPORTAR R1 — Sugerido por Líneas Compradas
  ═══════════════════════════════════════════ */
  function exportR1(nombre){
    const {r1,clientes} = window.RB;
    const cli = r1.find(c=>c.nombre===nombre);
    const cliBase = clientes.find(c=>c.nombre===nombre);
    if(!cli) return;

    const wb = XLSX.utils.book_new();
    const ws = {};
    let r = 0;

    // Fila 0: título principal
    setCell(ws,r,0,`SUGERIDO R1 — LÍNEAS COMPRADAS — ${nombre.toUpperCase()}`,S.titleDark);
    merge(ws,r,0,r,5);
    r++;

    // Fila 1: subtítulo
    setCell(ws,r,0,`Ventas: $${Math.round(cliBase?.ventaTotal||0).toLocaleString('es-MX')}  |  Arts. comprados: ${cliBase?.arts?.length||0}  |  Líneas activas: ${cli.lineasCompra.length}  |  Artículos sugeridos: ${cli.sugeridos.length}`,S.titleMed);
    merge(ws,r,0,r,5);
    r++;

    // Fila 2: metodología
    setCell(ws,r,0,'Metodología: Artículos activos · con stock · en líneas que el cliente ya compra · no adquiridos en Ene–May 2026',{font:{sz:8,italic:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'C0392B'}},alignment:{horizontal:'center'},border:border()});
    merge(ws,r,0,r,5);
    r++;
    r++; // espacio

    // Agrupar por línea
    const porLinea = {};
    cli.sugeridos.forEach(a=>{
      if(!porLinea[a.linea]) porLinea[a.linea]=[];
      porLinea[a.linea].push(a);
    });

    const hdrs = ['Clave','Descripción','Línea','Existencia Almacén','Estado','Observaciones'];
    const wCols = [12,55,22,16,12,18];
    let totalArts=0;

    Object.entries(porLinea).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([linea,arts])=>{
      // Encabezado de línea
      setCell(ws,r,0,`▸  LÍNEA: ${linea}   |   Artículos disponibles: ${arts.length}   |   Stock total: ${arts.reduce((s,a)=>s+a.exist,0)} pzas`,S.lineHdr);
      merge(ws,r,0,r,5);
      r++;

      // Headers columnas
      hdrs.forEach((h,c)=>{ setCell(ws,r,c,h,S.header); });
      r++;

      // Datos
      arts.forEach((a,i)=>{
        const ev = i%2===0;
        setCell(ws,r,0,a.clave,   ev?S.dataA:S.dataB);
        setCell(ws,r,1,a.desc,    ev?S.dataA:S.dataB);
        setCell(ws,r,2,a.linea,   ev?S.dataAC:S.dataBC);
        setCell(ws,r,3,a.exist,   ev?S.dataAC:S.dataBC);
        setCell(ws,r,4,'Disponible',ev?S.dataAC:S.dataBC);
        setCell(ws,r,5,'',        ev?S.dataA:S.dataB);
        r++;
      });
      totalArts+=arts.length;
    });

    // Total
    r++;
    setCell(ws,r,0,'TOTAL ARTÍCULOS SUGERIDOS',S.totalLbl); merge(ws,r,0,r,2);
    setCell(ws,r,3,totalArts,S.total);
    setCell(ws,r,4,'',S.total); setCell(ws,r,5,'',S.total);

    ws['!cols'] = wCols.map(w=>({wpx:w*6}));
    ws['!rows'] = [{hpx:22},{hpx:18},{hpx:14}];
    autoRange(ws, r, 5);

    XLSX.utils.book_append_sheet(wb, ws, 'R1 Sugerido');
    XLSX.writeFile(wb, `R1_${nombre.replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)}.xlsx`);
  }

  /* ═══════════════════════════════════════════
     EXPORTAR R2 — Top N% Rotación
  ═══════════════════════════════════════════ */
  function exportR2(nombre, pct){
    const {r2,clientes} = window.RB;
    const cli = r2.find(c=>c.nombre===nombre);
    const cliBase = clientes.find(c=>c.nombre===nombre);
    if(!cli) return;

    const wb = XLSX.utils.book_new();
    const ws = {};
    let r = 0;

    setCell(ws,r,0,`SUGERIDO R2 — TOP ${pct}% ROTACIÓN — ${nombre.toUpperCase()}`,S.titleDark);
    merge(ws,r,0,r,6);
    r++;

    setCell(ws,r,0,`Ventas: $${Math.round(cliBase?.ventaTotal||0).toLocaleString('es-MX')}  |  Líneas activas: ${cli.lineasCompra?.length||0}  |  Arts. sugeridos (top ${pct}%): ${cli.sugeridos.length}  |  Score promedio: ${cli.sugeridos.length?+(cli.sugeridos.reduce((s,a)=>s+a.score,0)/cli.sugeridos.length).toFixed(1):0}`,S.titleMed);
    merge(ws,r,0,r,6);
    r++;

    setCell(ws,r,0,`Metodología: Top ${pct}% artículos más vendidos (unidades) en el período · con stock activo · en líneas del cliente · no adquiridos en Ene–May 2026`,{font:{sz:8,italic:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1A5276'}},alignment:{horizontal:'center'},border:border()});
    merge(ws,r,0,r,6);
    r++;
    r++;

    // Agrupar por línea
    const porLinea = {};
    cli.sugeridos.forEach(a=>{
      if(!porLinea[a.linea]) porLinea[a.linea]=[];
      porLinea[a.linea].push(a);
    });

    const hdrs = ['Clave','Descripción','Línea','Existencia','Score Rotación','Rank Global','Uds Vendidas (período)'];
    const wCols = [12,55,22,12,14,12,20];

    Object.entries(porLinea).sort((a,b)=>{
      const avgA=a[1].reduce((s,x)=>s+x.score,0)/a[1].length;
      const avgB=b[1].reduce((s,x)=>s+x.score,0)/b[1].length;
      return avgB-avgA;
    }).forEach(([linea,arts])=>{
      const avgScore=(arts.reduce((s,a)=>s+a.score,0)/arts.length).toFixed(1);
      setCell(ws,r,0,`▸  LÍNEA: ${linea}   |   Arts.: ${arts.length}   |   Score promedio: ${avgScore}`,S.lineHdr);
      merge(ws,r,0,r,6);
      r++;

      hdrs.forEach((h,c)=>{
        const st = c===4?S.scoreH:c===5?S.scoreMed:S.header;
        setCell(ws,r,c,h,st);
      });
      r++;

      arts.forEach((a,i)=>{
        const ev=i%2===0;
        const scSt = a.score>=7?{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E8449'}},alignment:{horizontal:'center'},border:border()}
          : a.score>=4?{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'9A7D0A'}},alignment:{horizontal:'center'},border:border()}
          : {font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'A93226'}},alignment:{horizontal:'center'},border:border()};
        setCell(ws,r,0,a.clave,   ev?S.dataA:S.dataB);
        setCell(ws,r,1,a.desc,    ev?S.dataA:S.dataB);
        setCell(ws,r,2,a.linea,   ev?S.dataAC:S.dataBC);
        setCell(ws,r,3,a.exist,   ev?S.dataAC:S.dataBC);
        setCell(ws,r,4,a.score,   scSt);
        setCell(ws,r,5,'#'+a.rank,ev?S.dataAC:S.dataBC);
        setCell(ws,r,6,a.udsTotal,ev?S.dataAC:S.dataBC);
        r++;
      });
    });

    r++;
    setCell(ws,r,0,'TOTAL',S.totalLbl); merge(ws,r,0,r,2);
    setCell(ws,r,3,cli.sugeridos.length,S.total);
    [4,5,6].forEach(c=>setCell(ws,r,c,'',S.total));

    ws['!cols'] = wCols.map(w=>({wpx:w*6}));
    autoRange(ws, r, 6);

    XLSX.utils.book_append_sheet(wb, ws, `R2 Top${pct}%`);
    XLSX.writeFile(wb, `R2_Top${pct}pct_${nombre.replace(/[^a-zA-Z0-9]/g,'_').slice(0,25)}.xlsx`);
  }

  /* ═══════════════════════════════════════════
     EXPORTAR R3 — Líneas No Trabajadas
  ═══════════════════════════════════════════ */
  function exportR3(nombre){
    const {r3,clientes} = window.RB;
    const cli = r3.find(c=>c.nombre===nombre);
    const cliBase = clientes.find(c=>c.nombre===nombre);
    if(!cli) return;

    const wb = XLSX.utils.book_new();
    const ws = {};
    let r = 0;

    setCell(ws,r,0,`SUGERIDO R3 — LÍNEAS NO TRABAJADAS — ${nombre.toUpperCase()}`,S.titleDark);
    merge(ws,r,0,r,5);
    r++;

    setCell(ws,r,0,`Líneas que NO compra: ${cli.lineasFaltantes.length}  |  Artículos sugeridos: ${cli.sugeridos.length}  |  Total piezas (20%): ${cli.totalPiezas}  |  Ventas período: $${Math.round(cliBase?.ventaTotal||0).toLocaleString('es-MX')}`,S.titleMed);
    merge(ws,r,0,r,5);
    r++;

    setCell(ws,r,0,'Metodología: Artículos activos con stock en líneas que el cliente NO ha trabajado · Cantidad sugerida = 20% de la existencia actual del almacén',{font:{sz:8,italic:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'784212'}},alignment:{horizontal:'center'},border:border()});
    merge(ws,r,0,r,5);
    r++;
    r++;

    const porLinea = {};
    cli.sugeridos.forEach(a=>{
      if(!porLinea[a.linea]) porLinea[a.linea]=[];
      porLinea[a.linea].push(a);
    });

    const hdrs=['Clave','Descripción','Línea','Existencia Almacén','Sugerido Compra (20%)','Observaciones'];
    const wCols=[12,55,22,16,20,18];

    Object.entries(porLinea).sort((a,b)=>b[1].reduce((s,x)=>s+x.sug20,0)-a[1].reduce((s,x)=>s+x.sug20,0))
    .forEach(([linea,arts])=>{
      const totalPzs=arts.reduce((s,a)=>s+a.sug20,0);
      const hdrSt={font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'784212'}},alignment:{horizontal:'left'},border:border()};
      setCell(ws,r,0,`▸  LÍNEA: ${linea}   |   Artículos: ${arts.length}   |   Total piezas sugeridas: ${totalPzs}`,hdrSt);
      merge(ws,r,0,r,5);
      r++;

      hdrs.forEach((h,c)=>{ setCell(ws,r,c,h,S.header); });
      r++;

      arts.forEach((a,i)=>{
        const ev=i%2===0;
        const sugSt={font:{bold:true,sz:9,color:{rgb:'7E5109'}},fill:{fgColor:{rgb:ev?'FEF9E7':'FFFDE7'}},alignment:{horizontal:'center'},border:border()};
        setCell(ws,r,0,a.clave,  ev?S.dataA:S.dataB);
        setCell(ws,r,1,a.desc,   ev?S.dataA:S.dataB);
        setCell(ws,r,2,a.linea,  ev?S.dataAC:S.dataBC);
        setCell(ws,r,3,a.exist,  ev?S.dataAC:S.dataBC);
        setCell(ws,r,4,a.sug20,  sugSt);
        setCell(ws,r,5,'',       ev?S.dataA:S.dataB);
        r++;
      });
    });

    r++;
    setCell(ws,r,0,'TOTAL ARTÍCULOS',S.totalLbl); merge(ws,r,0,r,2);
    setCell(ws,r,3,cli.sugeridos.length,S.total);
    setCell(ws,r,4,cli.totalPiezas,S.total);
    setCell(ws,r,5,'',S.total);

    ws['!cols'] = wCols.map(w=>({wpx:w*6}));
    autoRange(ws, r, 5);

    XLSX.utils.book_append_sheet(wb, ws, 'R3 Líneas Nuevas');
    XLSX.writeFile(wb, `R3_LineasNuevas_${nombre.replace(/[^a-zA-Z0-9]/g,'_').slice(0,25)}.xlsx`);
  }

  /* ═══════════════════════════════════════════
     EXPORTAR RESUMEN TODOS LOS CLIENTES
  ═══════════════════════════════════════════ */
  function exportResumen(){
    const {clientes,r1,r2,r3,kpis} = window.RB;
    const wb = XLSX.utils.book_new();
    const ws = {};
    let r = 0;
    const pct = window.RB._r2pct||20;

    setCell(ws,r,0,'HARVIN DISTRIBUCIONES — RESUMEN SUGERIDO DE COMPRA POR CLIENTE',S.titleDark);
    merge(ws,r,0,r,8); r++;
    setCell(ws,r,0,`Ventas totales: $${Math.round(kpis.ventaTotal).toLocaleString('es-MX')}  |  Clientes: ${clientes.length}  |  Artículos c/stock: ${kpis.artsConStock.toLocaleString()}  |  Inactivos excluidos: ${kpis.inactivosN.toLocaleString()}  |  R2 Top ${pct}%`,S.titleMed);
    merge(ws,r,0,r,8); r++;
    r++;

    const hdrs=['#','Cliente','Ventas $','Arts. Comprados','Líneas Activas','Sugeridos R1','Sugeridos R2','Líneas Faltantes','Piezas R3 (20%)'];
    const wCols=[5,38,14,14,14,14,14,16,16];
    hdrs.forEach((h,c)=>setCell(ws,r,c,h,S.header));
    r++;

    const sorted=[...clientes].sort((a,b)=>b.ventaTotal-a.ventaTotal);
    sorted.forEach((cli,i)=>{
      const cr1=r1.find(x=>x.nombre===cli.nombre)||{};
      const cr2=r2.find(x=>x.nombre===cli.nombre)||{};
      const cr3=r3.find(x=>x.nombre===cli.nombre)||{};
      const ev=i%2===0;
      setCell(ws,r,0,i+1,      ev?S.dataAC:S.dataBC);
      setCell(ws,r,1,cli.nombre,ev?S.dataA:S.dataB);
      setCell(ws,r,2,Math.round(cli.ventaTotal),ev?S.dataAR:S.dataBR);
      setCell(ws,r,3,cli.arts.length,ev?S.dataAC:S.dataBC);
      setCell(ws,r,4,cr1.lineasCompra?.length||0,ev?S.dataAC:S.dataBC);
      setCell(ws,r,5,cr1.sugeridos?.length||0,ev?S.dataAC:S.dataBC);
      setCell(ws,r,6,cr2.sugeridos?.length||0,ev?S.dataAC:S.dataBC);
      setCell(ws,r,7,cr3.lineasFaltantes?.length||0,ev?S.dataAC:S.dataBC);
      setCell(ws,r,8,cr3.totalPiezas||0,ev?S.dataAC:S.dataBC);
      r++;
    });

    r++;
    setCell(ws,r,0,'TOTALES',S.totalLbl); merge(ws,r,0,r,1);
    setCell(ws,r,2,Math.round(kpis.ventaTotal),S.total);
    setCell(ws,r,5,kpis.sugerR1,S.total);
    setCell(ws,r,6,kpis.sugerR2,S.total);
    setCell(ws,r,8,r3.reduce((s,c)=>s+c.totalPiezas,0),S.total);
    [3,4,7].forEach(c=>setCell(ws,r,c,'',S.total));

    ws['!cols'] = wCols.map(w=>({wpx:w*6}));
    autoRange(ws, r, 8);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Clientes');
    XLSX.writeFile(wb, `Harvin_Resumen_Sugerido_Compra.xlsx`);
  }

  /* ── Exponer funciones globales ───────────── */
  window.exportR1       = exportR1;
  window.exportR2       = exportR2;
  window.exportR3       = exportR3;
  window.exportResumen  = exportResumen;

})();
