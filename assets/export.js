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


  /* ═══════════════════════════════════════════
     EXPORTAR R4 — Top Score Rotación Individual
  ═══════════════════════════════════════════ */
  function exportR4(nombre){
    const {r4,clientes} = window.RB;
    const cli = r4.find(c=>c.nombre===nombre);
    const cliBase = clientes.find(c=>c.nombre===nombre);
    if(!cli) return;

    const wb = XLSX.utils.book_new();
    const ws = {};
    let r = 0;

    // Título
    setCell(ws,r,0,`TOP SCORE ROTACIÓN — ${nombre.toUpperCase()}`,S.titleDark); merge(ws,r,0,r,9); r++;
    setCell(ws,r,0,`Ventas: $${Math.round(cli.ventaTotal).toLocaleString('es-MX')}  |  Arts. comprados: ${cli.arts.length}  |  Score prom: ${cli.arts.length?+(cli.arts.reduce((s,a)=>s+a.score,0)/cli.arts.length).toFixed(1):0}  |  Críticos (stock BAJO): ${cli.alertasBajo}`,S.titleMed); merge(ws,r,0,r,9); r++;
    setCell(ws,r,0,'Metodología: Score compuesto = 70% unidades + 30% venta (normalizados 0-10). Stock sugerido = 1.5× unidades compradas en el período.',{font:{sz:8,italic:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'922B21'}},alignment:{horizontal:'center'},border:border()}); merge(ws,r,0,r,9); r++;
    r++;

    // Agrupar por línea
    const porLinea = {};
    cli.arts.forEach(a=>{
      if(!a.linea) return;
      if(!porLinea[a.linea]) porLinea[a.linea]=[];
      porLinea[a.linea].push(a);
    });

    const hdrs=['Rank','Clave','Descripción','Línea','Uds Compradas','Venta $','Score (0-10)','Stock Actual','Stock Sugerido (1.5x)','Alerta Stock'];
    const wCols=[6,12,55,22,14,14,13,13,20,13];

    let rank=1;
    Object.entries(porLinea).sort((a,b)=>{
      const maxA=Math.max(...a[1].map(x=>x.score));
      const maxB=Math.max(...b[1].map(x=>x.score));
      return maxB-maxA;
    }).forEach(([linea,arts])=>{
      const totUds=arts.reduce((s,a)=>s+a.uds,0);
      const totVenta=arts.reduce((s,a)=>s+a.venta,0);
      const avgScore=(arts.reduce((s,a)=>s+a.score,0)/arts.length).toFixed(1);
      const hdrSt={font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'7B1C1C'}},alignment:{horizontal:'left'},border:border()};
      setCell(ws,r,0,`▸  LÍNEA: ${linea}   |   Arts: ${arts.length}   |   Uds totales: ${totUds}   |   Venta: $${Math.round(totVenta).toLocaleString('es-MX')}   |   Score prom: ${avgScore}`,hdrSt);
      merge(ws,r,0,r,9); r++;

      hdrs.forEach((h,c)=>{
        const st=c===6?S.scoreH:c===8?{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'145A32'}},alignment:{horizontal:'center'},border:border()}:S.header;
        setCell(ws,r,c,h,st);
      });
      r++;

      arts.forEach((a,i)=>{
        const ev=i%2===0;
        const scSt=a.score>=7?{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E8449'}},alignment:{horizontal:'center'},border:border()}
          :a.score>=4?{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'9A7D0A'}},alignment:{horizontal:'center'},border:border()}
          :{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'A93226'}},alignment:{horizontal:'center'},border:border()};
        const alSt=a.alertaStock==='BAJO'?{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'C0392B'}},alignment:{horizontal:'center'},border:border()}
          :a.alertaStock==='MEDIO'?{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'9A7D0A'}},alignment:{horizontal:'center'},border:border()}
          :{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E8449'}},alignment:{horizontal:'center'},border:border()};
        const sugSt={font:{bold:true,sz:9,color:{rgb:'145A32'}},fill:{fgColor:{rgb:ev?'EAFAF1':'D5F5E3'}},alignment:{horizontal:'center'},border:border()};
        setCell(ws,r,0,rank,    ev?S.dataAC:S.dataBC);
        setCell(ws,r,1,a.clave, ev?S.dataA:S.dataB);
        setCell(ws,r,2,a.desc,  ev?S.dataA:S.dataB);
        setCell(ws,r,3,a.linea, ev?S.dataAC:S.dataBC);
        setCell(ws,r,4,a.uds,   ev?S.dataAC:S.dataBC);
        setCell(ws,r,5,Math.round(a.venta),ev?S.dataAR:S.dataBR);
        setCell(ws,r,6,a.score, scSt);
        setCell(ws,r,7,a.stock, ev?S.dataAC:S.dataBC);
        setCell(ws,r,8,a.stockSugerido, sugSt);
        setCell(ws,r,9,a.alertaStock, alSt);
        r++; rank++;
      });
    });

    r++;
    setCell(ws,r,0,'TOTALES',S.totalLbl); merge(ws,r,0,r,3);
    setCell(ws,r,4,cli.arts.reduce((s,a)=>s+a.uds,0),S.total);
    setCell(ws,r,5,Math.round(cli.ventaTotal),S.total);
    [6,7,8,9].forEach(c=>setCell(ws,r,c,'',S.total));

    ws['!cols']=wCols.map(w=>({wpx:w*6}));
    autoRange(ws,r,9);
    XLSX.utils.book_append_sheet(wb,ws,'R4 Top Score');
    XLSX.writeFile(wb,`R4_TopScore_${nombre.replace(/[^a-zA-Z0-9]/g,'_').slice(0,25)}.xlsx`);
  }

  /* ── Exponer funciones globales ───────────── */

  /* ═══════════════════════════════════════════════
     EXPORTAR R5 GLOBAL — Orden de compra almacén
  ═══════════════════════════════════════════════ */
  function exportR5Global(){
    const {r5,periodo} = window.RB;
    if(!r5) return;
    const arts = r5.arts.filter(a=>a.compra>0||a.semaforo==='ROJO');

    const wb = XLSX.utils.book_new();
    const ws = {};
    let r = 0;

    const S5={
      title: { font:{bold:true,sz:13,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center',vertical:'center'}, border:border() },
      sub:   { font:{bold:true,sz:11,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1F618D'}}, alignment:{horizontal:'center',vertical:'center'}, border:border() },
      hdr:   { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border:border() },
      rojo:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'C0392B'}}, alignment:{horizontal:'center'}, border:border() },
      amar:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'9A7D0A'}}, alignment:{horizontal:'center'}, border:border() },
      verd:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1E8449'}}, alignment:{horizontal:'center'}, border:border() },
      abcA:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'6C3483'}}, alignment:{horizontal:'center'}, border:border() },
      abcB:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center'}, border:border() },
      abcC:  { font:{sz:9, color:{rgb:'717D7E'}}, fill:{fgColor:{rgb:'F2F3F4'}}, alignment:{horizontal:'center'}, border:border() },
      compra:{ font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center'}, border:border() },
      inv:   { font:{bold:true,sz:9, color:{rgb:'7E5109'}}, fill:{fgColor:{rgb:'FEF5E7'}}, alignment:{horizontal:'right'},  border:border() },
    };

    const title = `ORDEN DE COMPRA SUGERIDA — R5 — HARVIN DISTRIBUCIONES`;
    const meta  = `Período: ${periodo.texto||'—'} (${r5.dias} días) · Factor seguridad: ${Math.round(r5.factorSeg*100)}% · Arts. a comprar: ${arts.length} · Total piezas: ${r5.totalCompra.toLocaleString()} · Inversión estimada: $${Math.round(r5.totalInversion).toLocaleString('es-MX')}`;

    setCell(ws,r,0,title,S5.title); merge(ws,r,0,r,12); r++;
    setCell(ws,r,0,meta, S5.sub);  merge(ws,r,0,r,12); r++;
    r++;

    const hdrs=['Clave','Descripción','Línea','ABC','Clientes','Uds/Per.','Tasa/día','Stock actual','Cob. días','Compra sugerida','Precio unit. $','Inversión $','Semáforo'];
    const wc=[12,55,22,6,8,10,10,13,10,16,14,14,10];
    hdrs.forEach((h,c)=>setCell(ws,r,c,h,S5.hdr)); r++;

    let totalComp=0,totalInv=0;
    arts.forEach((a,i)=>{
      const ev=i%2===0;
      const dA=ev?S.dataA:S.dataB, dAC=ev?S.dataAC:S.dataBC, dAR=ev?S.dataAR:S.dataBR;
      const semSt=a.semaforo==='ROJO'?S5.rojo:a.semaforo==='AMARILLO'?S5.amar:S5.verd;
      const abcSt=a.abc==='A'?S5.abcA:a.abc==='B'?S5.abcB:S5.abcC;
      setCell(ws,r,0,a.clave,   dA);
      setCell(ws,r,1,a.desc,    dA);
      setCell(ws,r,2,a.linea,   dAC);
      setCell(ws,r,3,a.abc,     abcSt);
      setCell(ws,r,4,a.nClientes,dAC);
      setCell(ws,r,5,a.udsTotal, dAC);
      setCell(ws,r,6,a.tasa,     dAC);
      setCell(ws,r,7,a.exist,    dAC);
      setCell(ws,r,8,a.cobertura>=9999?'∞':a.cobertura, dAC);
      setCell(ws,r,9,a.compra,   S5.compra);
      setCell(ws,r,10,a.precio||0, dAR);
      setCell(ws,r,11,a.inversion||0, S5.inv);
      setCell(ws,r,12,a.semaforo, semSt);
      r++; totalComp+=a.compra; totalInv+=a.inversion||0;
    });

    r++;
    setCell(ws,r,0,'TOTALES',S.totalLbl); merge(ws,r,0,r,8);
    setCell(ws,r,9,totalComp,S.total);
    setCell(ws,r,10,'',S.total);
    setCell(ws,r,11,Math.round(totalInv),{...S.total,alignment:{horizontal:'right'}});
    setCell(ws,r,12,'',S.total);

    ws['!cols']=wc.map(w=>({wpx:w*6}));
    autoRange(ws,r,12);
    XLSX.utils.book_append_sheet(wb,ws,'R5 Orden de Compra');
    XLSX.writeFile(wb,'R5_OrdenCompra_Harvin.xlsx');
  }

  /* ═══════════════════════════════════════════════
     EXPORTAR R5 POR CLIENTE
  ═══════════════════════════════════════════════ */
  function exportR5Cliente(nombre){
    const {r5,periodo} = window.RB;
    if(!r5||!nombre) return;
    const cli=r5.porCliente.find(c=>c.nombre===nombre); if(!cli) return;
    const arts=cli.arts; // todos, ordenados por score

    const wb = XLSX.utils.book_new();
    const ws = {};
    let r = 0;

    const S5c={
      title: { font:{bold:true,sz:13,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center',vertical:'center'}, border:border() },
      sub:   { font:{bold:true,sz:11,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1F618D'}}, alignment:{horizontal:'center',vertical:'center'}, border:border() },
      hdr:   { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border:border() },
      rojo:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'C0392B'}}, alignment:{horizontal:'center'}, border:border() },
      amar:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'9A7D0A'}}, alignment:{horizontal:'center'}, border:border() },
      verd:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1E8449'}}, alignment:{horizontal:'center'}, border:border() },
      comp:  { font:{bold:true,sz:9, color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A5276'}}, alignment:{horizontal:'center'}, border:border() },
      sug:   { font:{bold:true,sz:9, color:{rgb:'1A5276'}}, fill:{fgColor:{rgb:'D6EAF8'}}, alignment:{horizontal:'center'}, border:border() },
      inv:   { font:{bold:true,sz:9, color:{rgb:'7E5109'}}, fill:{fgColor:{rgb:'FEF5E7'}}, alignment:{horizontal:'right'},  border:border() },
    };

    setCell(ws,r,0,`R5 — SUGERIDO INTELIGENTE — ${nombre.toUpperCase()}`,S5c.title); merge(ws,r,0,r,15); r++;
    setCell(ws,r,0,`Tier: ${cli.tier} · Período: ${periodo.texto||'—'} (${r5.dias} días) · Crecimiento: +${Math.round(cli.factorCrec*100)}% · Lead time: ${r5.leadTimeDias} días · Surtir hoy: ${cli.totalSurtibleHoy} · Pedir a proveedor: ${cli.totalPendienteProv} · Inversión: $${Math.round(cli.totalInversion).toLocaleString('es-MX')}`,S5c.sub); merge(ws,r,0,r,15); r++;
    setCell(ws,r,0,'Metodología: sugerido = promedio_mensual × (1+crecimiento) + colchón_resurtido, ajustado por devoluciones. "Surtir hoy" prioriza por tier de cliente cuando el stock es compartido.',{font:{sz:8,italic:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F618D'}},alignment:{horizontal:'center'},border:border()}); merge(ws,r,0,r,15); r++;
    r++;

    const hdrs=['#','Clave','Descripción','Línea','Score','Confianza','Uds/Per.','Prom/mes','Sugerido','Stock','A surtir','Surtir hoy','Pedir prov.','Precio $','Inversión $','Acción'];
    const wc=[5,12,42,18,8,11,9,10,11,9,10,11,12,11,12,11];
    hdrs.forEach((h,c)=>setCell(ws,r,c,h,S5c.hdr)); r++;

    arts.forEach((a,i)=>{
      const ev=i%2===0;
      const dA=ev?S.dataA:S.dataB, dAC=ev?S.dataAC:S.dataBC, dAR=ev?S.dataAR:S.dataBR;
      const accSt=a.accion==='COMPRAR'?S5c.rojo:a.accion==='REFORZAR'?S5c.amar:S5c.verd;
      setCell(ws,r,0,i+1,        dAC);
      setCell(ws,r,1,a.clave,    dA);
      setCell(ws,r,2,a.desc,     dA);
      setCell(ws,r,3,a.linea,    dAC);
      setCell(ws,r,4,a.score,    dAC);
      setCell(ws,r,5,a.confianza, dAC);
      setCell(ws,r,6,a.uds,      dAC);
      setCell(ws,r,7,a.promMensual, dAC);
      setCell(ws,r,8,a.sugerido, S5c.sug);
      setCell(ws,r,9,a.exist,    dAC);
      setCell(ws,r,10,a.aReforzar, dAC);
      setCell(ws,r,11,a.surtibleHoy||0, S5c.verd);
      setCell(ws,r,12,a.pendienteProv||0, (a.pendienteProv||0)>0?S5c.rojo:dAC);
      setCell(ws,r,13,a.precio||0, dAR);
      setCell(ws,r,14,a.inversion||0, S5c.inv);
      setCell(ws,r,15,a.accion,  accSt);
      r++;
    });

    r++;
    setCell(ws,r,0,'TOTALES',S.totalLbl); merge(ws,r,0,r,7);
    setCell(ws,r,8,cli.totalSugerido,S.total);
    setCell(ws,r,9,'',S.total);
    setCell(ws,r,10,cli.totalReforzar,S.total);
    setCell(ws,r,11,cli.totalSurtibleHoy,S.total);
    setCell(ws,r,12,cli.totalPendienteProv,S.total);
    setCell(ws,r,13,'',S.total);
    setCell(ws,r,14,Math.round(cli.totalInversion),{...S.total,alignment:{horizontal:'right'}});
    setCell(ws,r,15,'',S.total);

    ws['!cols']=wc.map(w=>({wpx:w*6}));
    autoRange(ws,r,15);
    XLSX.utils.book_append_sheet(wb,ws,'R5 Sugerido Cliente');
    XLSX.writeFile(wb,`R5_${nombre.replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)}.xlsx`);
  }

  window.exportR1       = exportR1;
  window.exportR4       = exportR4;
  window.exportR2       = exportR2;
  window.exportR3       = exportR3;
  window.exportResumen  = exportResumen;
  window.exportR5Global  = exportR5Global;
  window.exportR5Cliente = exportR5Cliente;

})();
