/* ═══════════════════════════════════════════════════════════
   parser.js v3.0 — Robot Sugerido · Harvin Distribuciones
   ───────────────────────────────────────────────────────────
   Expone: window.RB = {
     inv, catalogo, inactivos, clientes,
     precioMap,          ← precio promedio ponderado x artículo
     r1, r2, r3, r4,
     r5,                 ← nuevo: sugerido de compra por demanda
     kpis, periodo
   }
   Novedades v3:
   · precioMap: precio_unit = suma(venta) / suma(uds) por artículo
   · R1/R2/R3/R4 enriquecidos con precio y valor_sugerido
   · R5 global (almacén) + per-cliente con cobertura/semáforo/ABC
   · Auto-detección de días del período desde header VCLIE
   · Fix EXIVAL footer rows ("Total X artículos")
   · Cache-busting fetch + Uint8Array para máx. compatibilidad
   ═══════════════════════════════════════════════════════════ */
(function () {

  /* ── Utilidades ─────────────────────────────────────────── */
  function pn(v) {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(String(v).replace(/[,$]/g, '').trim());
    return isNaN(n) ? 0 : n;
  }
  function ps(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
  function arr2d(ws) { return XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true }); }

  /* ── Detectar días del período desde encabezado VCLIE ───── */
  function detectPeriodoDias(raw) {
    for (let i = 0; i < Math.min(raw.length, 10); i++) {
      const r = raw[i];
      if (!r) continue;
      const v = ps(r[0]);
      // "Periodo del 01/jun./2026 al 15/jun./2026"
      const m = v.match(/del\s+(\d+)\/(\w+)\.?\/(\d+)\s+al\s+(\d+)\/(\w+)\.?\/(\d+)/i);
      if (m) {
        const meses = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, oct:9, nov:10, dic:11 };
        const d1 = new Date(+m[3], meses[m[2].toLowerCase().slice(0,3)] ?? 0, +m[1]);
        const d2 = new Date(+m[6], meses[m[5].toLowerCase().slice(0,3)] ?? 0, +m[4]);
        const dias = Math.round((d2 - d1) / 86400000) + 1;
        if (dias > 0) return { dias, texto: v.replace(/.*Periodo/i, 'Periodo') };
      }
    }
    return { dias: 15, texto: 'Período no detectado' };
  }

  /* ── EXIVAL ─ inventario actual ─────────────────────────── */
  function parseExival(wb) {
    const raw = arr2d(wb.Sheets['EXIVAL']);
    const inv = {};
    for (let i = 6; i < raw.length; i++) {
      const row = raw[i];
      if (!row) continue;
      const clave = ps(row[0]);
      if (!clave) continue;
      // Excluir filas footer del reporte ("Total X artículos", "X artículos sin existencia")
      const cl = clave.toLowerCase();
      if (cl.startsWith('total') || cl.includes('artículo') || cl.includes('articulo')) continue;
      inv[clave] = { exist: pn(row[3]), desc: ps(row[1]) };
    }
    return inv;
  }

  /* ── AL ─ catálogo con líneas ───────────────────────────── */
  function parseCatalogo(wb) {
    const raw = arr2d(wb.Sheets['AL']);
    const cat = {};
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row) continue;
      const clave = ps(row[0]);
      if (!clave) continue;
      cat[clave] = {
        desc:       ps(row[1]),
        linea:      ps(row[2]),
        estatus:    ps(row[9]),
        ult_compra: ps(row[8]),
      };
    }
    return cat;
  }

  /* ── PRECIO MAP ─ precio unitario promedio ponderado ─────── */
  /* precio_unit = suma(venta_positiva) / suma(uds_positivas) */
  function parsePrecioMap(rawV) {
    const acc = {}; // clave -> {sumVenta, sumUds}
    for (let i = 0; i < rawV.length; i++) {
      const r = rawV[i];
      if (!r) continue;
      const clave = ps(r[0]);
      if (!clave) continue;
      if (r[12] === null || r[12] === undefined || typeof r[12] === 'string') continue;
      const venta = pn(r[12]);
      const uds   = pn(r[14]);
      if (uds <= 0 || venta <= 0) continue; // solo positivos (excluye devoluciones)
      if (!acc[clave]) acc[clave] = { sumV: 0, sumU: 0 };
      acc[clave].sumV += venta;
      acc[clave].sumU += uds;
    }
    const pm = {};
    Object.entries(acc).forEach(([k, v]) => {
      if (v.sumU > 0) pm[k] = +(v.sumV / v.sumU).toFixed(2);
    });
    return pm;
  }

  /* ── INACTIVOS ─ artículos sin venta en el período ─────── */
  function parseInactivos(rawV, rawE) {
    const conVenta = new Set();
    for (let i = 0; i < rawV.length; i++) {
      const r = rawV[i];
      if (!r) continue;
      const clave = ps(r[0]);
      const venta = r[12];
      if (clave && typeof venta === 'number' && venta > 0) conVenta.add(clave);
    }
    const ina = new Set();
    for (let i = 6; i < rawE.length; i++) {
      const row = rawE[i];
      if (!row) continue;
      const clave = ps(row[0]);
      if (!clave) continue;
      const cl = clave.toLowerCase();
      if (cl.startsWith('total') || cl.includes('artículo') || cl.includes('articulo')) continue;
      if (!conVenta.has(clave)) ina.add(clave);
    }
    return ina;
  }

  /* ── VCLIE ─ ventas por cliente ─────────────────────────── */
  function parseVclie(rawV, precioMap) {
    const cliRows = [];
    for (let i = 0; i < rawV.length; i++) {
      const r = rawV[i];
      if (!r) continue;
      const nombre = ps(r[3]);
      if (nombre && nombre !== 'nan' && nombre !== 'Cliente') cliRows.push({ i, nombre });
    }

    const clientes = [];
    for (let ci = 0; ci < cliRows.length; ci++) {
      const cr  = cliRows[ci];
      const fin = ci + 1 < cliRows.length ? cliRows[ci + 1].i : rawV.length;
      const arts = [];

      for (let j = cr.i + 2; j < fin; j++) {
        const r     = rawV[j];
        if (!r) continue;
        const clave = ps(r[0]);
        if (!clave) continue;
        if (r[12] === null || r[12] === undefined) continue;
        if (typeof r[12] === 'string') continue;
        if (isNaN(+r[12])) continue;
        const venta = pn(r[12]);
        const uds   = pn(r[14]);
        // Precio unitario: precio real pagado por este cliente en esta línea
        const precio_unit = (uds !== 0) ? +(Math.abs(venta) / Math.abs(uds)).toFixed(2) : (precioMap[clave] || 0);
        arts.push({ clave, desc: ps(r[4]), venta, uds, precio_unit });
      }

      clientes.push({
        id:         ps(rawV[cr.i][0]),
        nombre:     cr.nombre,
        arts,
        ventaTotal: arts.reduce((s, a) => s + a.venta, 0),
        udsTotal:   arts.reduce((s, a) => s + a.uds,   0),
      });
    }
    return clientes;
  }

  /* ── R1 ─ sugerido por líneas compradas ─────────────────── */
  function buildR1(clientes, inv, catalogo, inactivos, precioMap) {
    const activos = new Set(
      Object.keys(inv).filter(k => inv[k].exist > 0 && !inactivos.has(k))
    );
    return clientes.map(cli => {
      const compradas = new Set(cli.arts.map(a => (catalogo[a.clave] || {}).linea).filter(Boolean));
      const yaCompro  = new Set(cli.arts.map(a => a.clave));
      const sugeridos = [];
      activos.forEach(k => {
        const cat   = catalogo[k] || {};
        const linea = cat.linea || '';
        if (!linea || !compradas.has(linea) || yaCompro.has(k)) return;
        const precio = precioMap[k] || 0;
        sugeridos.push({
          clave:    k,
          desc:     cat.desc,
          linea:    cat.linea,
          exist:    inv[k].exist,
          precio,
          valorSug: +(precio * inv[k].exist).toFixed(0),
        });
      });
      return {
        nombre:       cli.nombre,
        ventaTotal:   cli.ventaTotal,
        lineasCompra: [...compradas],
        sugeridos,
        valorTotalSug: sugeridos.reduce((s, a) => s + a.valorSug, 0),
      };
    });
  }

  /* ── R2 ─ top N% rotación ───────────────────────────────── */
  function buildR2(clientes, inv, catalogo, inactivos, precioMap) {
    const rotMap = {};
    clientes.forEach(cli => cli.arts.forEach(a => {
      if (a.uds > 0) rotMap[a.clave] = (rotMap[a.clave] || 0) + a.uds;
    }));
    const sorted   = Object.entries(rotMap).sort((a, b) => b[1] - a[1]);
    const top20n   = Math.ceil(sorted.length * 0.20);
    const top20set = new Set(sorted.slice(0, top20n).map(x => x[0]));
    const activos  = new Set(Object.keys(inv).filter(k => inv[k].exist > 0 && !inactivos.has(k)));
    const sugeribles = [...top20set].filter(k => activos.has(k));
    const maxRot   = sorted[0] ? sorted[0][1] : 1;
    const scoreMap = {};
    sorted.forEach(([k, v], i) => {
      scoreMap[k] = { score: +(v / maxRot * 10).toFixed(1), rank: i + 1, uds: v };
    });
    return clientes.map(cli => {
      const compradas = new Set(cli.arts.map(a => (catalogo[a.clave] || {}).linea).filter(Boolean));
      const yaCompro  = new Set(cli.arts.map(a => a.clave));
      const sugeridos = sugeribles
        .filter(k => {
          const linea = (catalogo[k] || {}).linea || '';
          return linea && compradas.has(linea) && !yaCompro.has(k);
        })
        .map(k => {
          const sm     = scoreMap[k] || {};
          const precio = precioMap[k] || 0;
          return {
            clave:    k,
            desc:     (catalogo[k] || {}).desc,
            linea:    (catalogo[k] || {}).linea,
            exist:    inv[k].exist,
            score:    sm.score  || 0,
            rank:     sm.rank   || 0,
            udsTotal: rotMap[k] || 0,
            precio,
            valorSug: +(precio * inv[k].exist).toFixed(0),
          };
        })
        .sort((a, b) => b.score - a.score);
      return {
        nombre:        cli.nombre,
        ventaTotal:    cli.ventaTotal,
        lineasCompra:  [...compradas],
        sugeridos,
        scoreMap,
        valorTotalSug: sugeridos.reduce((s, a) => s + a.valorSug, 0),
      };
    });
  }

  /* ── R3 ─ líneas NO trabajadas ──────────────────────────── */
  function buildR3(clientes, inv, catalogo, inactivos, precioMap) {
    const todasLineas = [...new Set(Object.values(catalogo).map(v => v.linea).filter(Boolean))].sort();
    const activos = new Set(Object.keys(inv).filter(k => inv[k].exist > 0 && !inactivos.has(k)));
    return clientes.map(cli => {
      const compradas = new Set(cli.arts.map(a => (catalogo[a.clave] || {}).linea).filter(Boolean));
      const faltantes = todasLineas.filter(l => !compradas.has(l));
      const sugeridos = [];
      activos.forEach(k => {
        const cat   = catalogo[k] || {};
        const linea = cat.linea || '';
        if (!linea || !faltantes.includes(linea)) return;
        const sug20  = Math.max(1, Math.ceil(inv[k].exist * 0.20));
        const precio = precioMap[k] || 0;
        sugeridos.push({
          clave:    k,
          desc:     cat.desc,
          linea:    cat.linea,
          exist:    inv[k].exist,
          sug20,
          precio,
          valorSug20: +(precio * sug20).toFixed(0),
        });
      });
      sugeridos.sort((a, b) => a.linea.localeCompare(b.linea) || a.clave.localeCompare(b.clave));
      return {
        nombre:          cli.nombre,
        ventaTotal:      cli.ventaTotal,
        lineasCompra:    [...compradas],
        lineasFaltantes: faltantes,
        sugeridos,
        totalPiezas:     sugeridos.reduce((s, a) => s + a.sug20, 0),
        valorTotalSug:   sugeridos.reduce((s, a) => s + a.valorSug20, 0),
      };
    });
  }

  /* ── R4 ─ Top Score Rotación Individual por cliente ──────── */
  function buildR4(clientes, inv, catalogo) {
    return clientes.map(cli => {
      if (!cli.arts.length) return {
        nombre: cli.nombre, ventaTotal: cli.ventaTotal, udsTotal: 0,
        arts: [], porLinea: {}, topArts: [], alertasBajo: 0, alertasMedio: 0,
      };
      const artsPos  = cli.arts.filter(a => a.uds > 0);
      const maxUds   = Math.max(...artsPos.map(a => a.uds))   || 1;
      const maxVenta = Math.max(...artsPos.map(a => a.venta)) || 1;

      const arts = cli.arts.map(a => {
        const cat   = catalogo[a.clave] || {};
        const stock = (inv[a.clave] || {}).exist || 0;
        const scoreUds   = a.uds   > 0 ? a.uds   / maxUds   : 0;
        const scoreVenta = a.venta > 0 ? a.venta / maxVenta : 0;
        const score = +((scoreUds * 0.7 + scoreVenta * 0.3) * 10).toFixed(1);
        const alertaStock = stock < a.uds ? 'BAJO' : stock < a.uds * 2 ? 'MEDIO' : 'OK';
        return {
          clave: a.clave,
          desc:  cat.desc  || a.desc || '',
          linea: cat.linea || '',
          uds:   a.uds,
          venta: a.venta,
          precio_unit: a.precio_unit,  // precio real pagado por este cliente
          stock,
          score,
          alertaStock,
          stockSugerido: Math.max(0, Math.ceil(a.uds * 1.5)),
        };
      }).sort((a, b) => b.score - a.score);

      const porLinea = {};
      arts.forEach(a => {
        if (!a.linea) return;
        if (!porLinea[a.linea]) porLinea[a.linea] = { uds:0, venta:0, arts:0, scoreMax:0 };
        porLinea[a.linea].uds    += a.uds;
        porLinea[a.linea].venta  += a.venta;
        porLinea[a.linea].arts   += 1;
        porLinea[a.linea].scoreMax = Math.max(porLinea[a.linea].scoreMax, a.score);
      });

      return {
        nombre:       cli.nombre,
        ventaTotal:   cli.ventaTotal,
        udsTotal:     cli.udsTotal,
        arts,
        porLinea,
        topArts:      arts.slice(0, 20),
        alertasBajo:  arts.filter(a => a.alertaStock === 'BAJO').length,
        alertasMedio: arts.filter(a => a.alertaStock === 'MEDIO').length,
      };
    });
  }

  /* ── R5 ─ Sugerido de Compra por Demanda ────────────────── */
  /*   factorSeg: 0.0 = solo demanda mensual exacta
       0.5 (default) = 15 días de colchón extra
       1.0 = 2 meses de stock total                          */
  /* Factor de crecimiento escalonado por madurez del cliente.
     Cliente grande/maduro → crecimiento marginal; pequeño con potencial → mayor empuje. */
  function factorCrecimiento(udsTotalCliente) {
    if (udsTotalCliente > 4000) return 0.05; // grande/maduro:  +5%
    if (udsTotalCliente > 1500) return 0.10; // mediano:        +10%
    if (udsTotalCliente > 500)  return 0.15; // en desarrollo:  +15%
    return 0.20;                              // pequeño potencial: +20%
  }

  /* Tier de cliente por peso acumulado en ventas (Pareto):
     ORO = top hasta 70% de la venta · PLATA = hasta 90% · BRONCE = resto.
     Cuando el stock no alcanza, se prioriza surtir al cliente de mayor tier. */
  function calcularTiers(clientes) {
    const orden = clientes.map(c => ({ nombre: c.nombre, venta: c.ventaTotal }))
                          .sort((a, b) => b.venta - a.venta);
    const totalV = orden.reduce((s, c) => s + c.venta, 0) || 1;
    const tier = {};
    let cum = 0;
    orden.forEach(c => {
      cum += c.venta;
      const pct = cum / totalV;
      tier[c.nombre] = pct <= 0.70 ? 'ORO' : pct <= 0.90 ? 'PLATA' : 'BRONCE';
    });
    return tier;
  }

  function buildR5(clientes, inv, catalogo, inactivos, precioMap, dias, factorSeg, leadTimeDias) {
    if (dias <= 0) dias = 15;
    if (factorSeg === undefined || factorSeg === null) factorSeg = 0.5;
    if (leadTimeDias === undefined || leadTimeDias === null) leadTimeDias = 15;

    const tierMap  = calcularTiers(clientes);
    const tierRank = { ORO: 0, PLATA: 1, BRONCE: 2 };

    /* ── Demanda global por artículo (suma de todos los clientes) ──
       Registra también devoluciones (uds < 0) para medir la tasa. */
    const demMap = {};
    clientes.forEach(cli => {
      cli.arts.forEach(a => {
        if (!demMap[a.clave]) demMap[a.clave] = { uds: 0, venta: 0, devUds: 0, lineas: 0, clientes: new Set() };
        if (a.uds > 0) {
          demMap[a.clave].uds    += a.uds;
          demMap[a.clave].venta  += a.venta;
          demMap[a.clave].lineas += 1;
          demMap[a.clave].clientes.add(cli.nombre);
        } else if (a.uds < 0) {
          demMap[a.clave].devUds += Math.abs(a.uds);   // devoluciones
        }
      });
    });

    /* ── Clasificación ABC por venta total del período ── */
    const sortedVenta = Object.entries(demMap).sort((a, b) => b[1].venta - a[1].venta);
    const totalV = sortedVenta.reduce((s, [, v]) => s + v.venta, 0);
    let cumV = 0;
    sortedVenta.forEach(([k, v]) => {
      cumV += v.venta;
      demMap[k].abc = cumV / totalV <= 0.80 ? 'A' : cumV / totalV <= 0.95 ? 'B' : 'C';
    });

    /* ── Cálculo de cobertura y compra sugerida ── */
    const arts = [];
    Object.entries(demMap).forEach(([clave, d]) => {
      const cat    = catalogo[clave] || {};
      const exist  = (inv[clave] || {}).exist || 0;
      const precio = precioMap[clave] || 0;
      const tasa   = d.uds / dias;                         // uds/día
      const demMes = tasa * 30;                            // demanda mensual proyectada
      const optimo = Math.ceil(demMes * (1 + factorSeg));  // stock objetivo
      const compra = Math.max(0, optimo - exist);
      const cobert = tasa > 0 ? +(exist / tasa).toFixed(1) : 9999;
      const tasaDev = (d.uds + d.devUds) > 0 ? +(d.devUds / (d.uds + d.devUds) * 100).toFixed(1) : 0;
      const semaf  = exist === 0 && d.uds > 0 ? 'ROJO'
                   : cobert <  7 ? 'ROJO'
                   : cobert < 30 ? 'AMARILLO'
                   : 'VERDE';

      arts.push({
        clave,
        desc:       cat.desc  || '',
        linea:      cat.linea || '',
        udsTotal:   d.uds,
        ventaTotal: +d.venta.toFixed(2),
        nClientes:  d.clientes.size,
        abc:        d.abc,
        exist,
        precio,
        tasa:       +tasa.toFixed(3),
        demMes:     +demMes.toFixed(1),
        optimo,
        compra,
        cobertura:  cobert,
        semaforo:   semaf,
        tasaDev,
        inversion:  +(compra * precio).toFixed(0),
        isActivo:   !inactivos.has(clave),
      });
    });

    const semOrd = { ROJO: 0, AMARILLO: 1, VERDE: 2 };
    arts.sort((a, b) => {
      if (semOrd[a.semaforo] !== semOrd[b.semaforo]) return semOrd[a.semaforo] - semOrd[b.semaforo];
      return b.compra - a.compra;
    });

    /* ── Vista por cliente — SUGERIDO INTELIGENTE (la joya de la corona) ──
       Combina: promedio mensual + score de prioridad + crecimiento escalonado
       + colchón de resurtido + penalización por devoluciones + índice de confianza,
       cruzado contra inventario y con tier de cliente para priorizar el surtido. */
    const porCliente = clientes.map(cli => {
      const artsPos = cli.arts.filter(a => a.uds > 0);
      const udsTotalCli = artsPos.reduce((s, a) => s + a.uds, 0);
      const factorCrec  = factorCrecimiento(udsTotalCli);
      const tier        = tierMap[cli.nombre] || 'BRONCE';
      const maxU = artsPos.length ? Math.max.apply(null, artsPos.map(a => a.uds))   : 1;
      const maxV = artsPos.length ? Math.max.apply(null, artsPos.map(a => a.venta)) : 1;

      const cliArts = artsPos.map(a => {
        const cat    = catalogo[a.clave] || {};
        const exist  = (inv[a.clave] || {}).exist || 0;
        const precio = a.precio_unit || precioMap[a.clave] || 0;
        const tasa   = a.uds / dias;                          // uds/día de ESTE cliente
        const dGlob  = demMap[a.clave] || { uds: 0, devUds: 0, lineas: 0, clientes: new Set() };

        // 1. Promedio mensual histórico del cliente para este artículo
        const promMensual = +(tasa * 30).toFixed(2);
        // 2. Demanda proyectada con crecimiento escalonado
        const demProy     = +(promMensual * (1 + factorCrec)).toFixed(2);
        // 3. Colchón de resurtido (demanda durante el lead time del proveedor)
        const colchon     = +(tasa * leadTimeDias).toFixed(2);

        // MEJORA 2 — Penalización por devoluciones (tasa global del artículo)
        const tasaDev   = (dGlob.uds + dGlob.devUds) > 0
                        ? dGlob.devUds / (dGlob.uds + dGlob.devUds) : 0;
        const penalizDev = 1 - Math.min(tasaDev, 0.5);   // hasta -50% si devuelve mucho

        // 4. Sugerido ajustado por devoluciones
        const sugerido = Math.max(1, Math.ceil((demProy + colchon) * penalizDev));

        // Score de prioridad (70% uds + 30% venta)
        const score = +((a.uds / maxU * 0.7 + a.venta / maxV * 0.3) * 10).toFixed(1);

        // MEJORA 3 — Índice de confianza del sugerido
        // Más unidades históricas y más clientes comprándolo = más confiable.
        // Penaliza artículos con devolución alta.
        let conf = 0;
        if (a.uds >= 10) conf += 2; else if (a.uds >= 4) conf += 1;
        if (dGlob.clientes.size >= 3) conf += 2; else if (dGlob.clientes.size >= 2) conf += 1;
        if (tasaDev > 0.2) conf -= 2; else if (tasaDev > 0.1) conf -= 1;
        const confianza = conf >= 3 ? 'ALTA' : conf >= 1 ? 'MEDIA' : 'BAJA';

        // Acción según inventario disponible
        const accion = exist >= sugerido ? 'CUBIERTO'
                     : exist === 0       ? 'COMPRAR'
                     : 'REFORZAR';
        const aReforzar = Math.max(0, sugerido - exist);
        const cobert    = tasa > 0 ? +(exist / tasa).toFixed(1) : 9999;
        const semaf     = accion === 'COMPRAR' ? 'ROJO'
                        : accion === 'REFORZAR' ? 'AMARILLO'
                        : 'VERDE';

        return {
          clave:       a.clave,
          desc:        cat.desc  || a.desc || '',
          linea:       cat.linea || '',
          uds:         a.uds,
          venta:       a.venta,
          precio,
          score,
          exist,
          promMensual,
          demProy,
          colchon,
          sugerido,
          aReforzar,
          accion,
          tasa:        +tasa.toFixed(3),
          cobertura:   cobert,
          semaforo:    semaf,
          tasaDev:     +(tasaDev * 100).toFixed(1),
          confianza,
          stockGlobal: (inv[a.clave] || {}).exist || 0,
          nClientesArt: dGlob.clientes.size,
          inversion:   Math.round(aReforzar * precio),
        };
      });

      // Orden por prioridad (score desc)
      cliArts.sort((a, b) => b.score - a.score);

      return {
        nombre:         cli.nombre,
        ventaTotal:     cli.ventaTotal,
        tier,
        factorCrec,
        udsTotalCli,
        arts:           cliArts,
        totalSugerido:  cliArts.reduce((s, a) => s + a.sugerido, 0),
        totalReforzar:  cliArts.reduce((s, a) => s + a.aReforzar, 0),
        totalInversion: cliArts.reduce((s, a) => s + a.inversion, 0),
        urgentes:       cliArts.filter(a => a.accion === 'COMPRAR').length,
        reforzar:       cliArts.filter(a => a.accion === 'REFORZAR').length,
        cubiertos:      cliArts.filter(a => a.accion === 'CUBIERTO').length,
        totalCompra:    cliArts.reduce((s, a) => s + a.aReforzar, 0),
      };
    });

    /* ── MEJORA 1 — Asignación de stock por prioridad de cliente ──
       Para cada artículo, si la suma de "a reforzar" de todos los clientes
       supera el stock disponible, se reparte priorizando por tier (ORO→PLATA→BRONCE)
       y luego por score. Cada línea recibe cuánto puede surtirse REALMENTE hoy. */
    const pedidosPorArt = {};
    porCliente.forEach(cli => {
      cli.arts.forEach(a => {
        if (a.aReforzar <= 0) return;
        if (!pedidosPorArt[a.clave]) pedidosPorArt[a.clave] = [];
        pedidosPorArt[a.clave].push({
          cliente: cli.nombre, tier: cli.tier, score: a.score,
          pide: a.aReforzar, ref: a,
        });
      });
    });
    Object.entries(pedidosPorArt).forEach(([clave, reqs]) => {
      const stock = (inv[clave] || {}).exist || 0;
      // Ordenar por prioridad: tier, luego score
      reqs.sort((x, y) => (tierRank[x.tier] - tierRank[y.tier]) || (y.score - x.score));
      let restante = stock;
      reqs.forEach(req => {
        const surtible = Math.min(req.pide, Math.max(0, restante));
        restante -= surtible;
        req.ref.surtibleHoy   = surtible;             // cuánto se puede dar YA
        req.ref.pendienteProv = req.pide - surtible;  // cuánto requiere comprar al proveedor
        req.ref.competido     = reqs.length > 1 && stock < reqs.reduce((s, r) => s + r.pide, 0);
      });
    });
    // Para los artículos sin competencia, surtibleHoy = lo disponible vs lo que pide
    porCliente.forEach(cli => {
      cli.arts.forEach(a => {
        if (a.surtibleHoy === undefined) {
          a.surtibleHoy   = Math.min(a.aReforzar, a.exist);
          a.pendienteProv = Math.max(0, a.aReforzar - a.surtibleHoy);
          a.competido     = false;
        }
      });
      cli.totalSurtibleHoy = cli.arts.reduce((s, a) => s + (a.surtibleHoy || 0), 0);
      cli.totalPendienteProv = cli.arts.reduce((s, a) => s + (a.pendienteProv || 0), 0);
    });

    return {
      arts,
      porCliente,
      dias,
      factorSeg,
      leadTimeDias,
      // KPIs globales
      totalArts:      arts.length,
      totalCompra:    arts.reduce((s, a) => s + a.compra, 0),
      totalInversion: arts.reduce((s, a) => s + a.inversion, 0),
      rojos:          arts.filter(a => a.semaforo === 'ROJO').length,
      amarillos:      arts.filter(a => a.semaforo === 'AMARILLO').length,
      verdes:         arts.filter(a => a.semaforo === 'VERDE').length,
      artsA:          arts.filter(a => a.abc === 'A').length,
      artsSinStock:   arts.filter(a => a.exist === 0).length,
    };
  }

  /* ── KPIs globales ──────────────────────────────────────── */
  function buildKpis(inv, catalogo, inactivos, clientes, r1, r2, r5) {
    const totalStock   = Object.values(inv).reduce((s, v) => s + v.exist, 0);
    const artsConStock = Object.values(inv).filter(v => v.exist > 0).length;
    const ventaTotal   = clientes.reduce((s, c) => s + c.ventaTotal, 0);
    const udsTotal     = clientes.reduce((s, c) => s + c.udsTotal,   0);

    const rotMap = {};
    clientes.forEach(cli => cli.arts.forEach(a => {
      if (a.uds > 0) rotMap[a.clave] = (rotMap[a.clave] || 0) + a.uds;
    }));
    const sorted  = Object.entries(rotMap).sort((a, b) => b[1] - a[1]);
    const top20n  = Math.ceil(sorted.length * 0.20);
    const sugerR1 = r1.reduce((s, c) => s + c.sugeridos.length, 0);
    const sugerR2 = r2.reduce((s, c) => s + c.sugeridos.length, 0);

    const ventaLinea = {};
    clientes.forEach(cli => cli.arts.forEach(a => {
      const linea = (catalogo[a.clave] || {}).linea || 'SIN LÍNEA';
      ventaLinea[linea] = (ventaLinea[linea] || 0) + a.venta;
    }));

    const topClientes = [...clientes].sort((a, b) => b.ventaTotal - a.ventaTotal);
    const rotPct = totalStock > 0 ? +(udsTotal / totalStock * 100).toFixed(1) : 0;

    return {
      totalStock, artsConStock,
      totalArts:      Object.keys(inv).length,
      inactivosN:     inactivos.size,
      ventaTotal,     udsTotal,
      artsVendidos:   sorted.length,
      top20n,         sugerR1, sugerR2,
      rotPct,
      ventaLinea,     topClientes,
      // R5 KPIs
      r5Rojos:        r5 ? r5.rojos         : 0,
      r5Inversion:    r5 ? r5.totalInversion : 0,
      r5TotalCompra:  r5 ? r5.totalCompra    : 0,
    };
  }

  /* ── Carga principal ─────────────────────────────────────── */
  async function load() {
    const loader = document.getElementById('loader');
    const msg    = loader.querySelector('p');
    try {
      msg.textContent = 'Cargando ROBOTBETO.xlsx…';
      const resp = await fetch('./data/ROBOTBETO.xlsx?v=' + Date.now());
      if (!resp.ok) throw new Error('No se pudo cargar ROBOTBETO.xlsx (HTTP ' + resp.status + ')');

      msg.textContent = 'Leyendo datos…';
      const buf  = await resp.arrayBuffer();
      const wb   = XLSX.read(new Uint8Array(buf), { type: 'array', raw: true, cellDates: false });

      const missing = ['EXIVAL', 'VCLIE', 'AL'].filter(s => !wb.Sheets[s]);
      if (missing.length) throw new Error('Hojas faltantes: ' + missing.join(', '));

      // Leer hojas en bruto una sola vez
      const rawV = arr2d(wb.Sheets['VCLIE']);
      const rawE = arr2d(wb.Sheets['EXIVAL']);

      msg.textContent = 'Procesando inventario…';
      const inv       = parseExival(wb);
      const catalogo  = parseCatalogo(wb);

      msg.textContent = 'Calculando precios…';
      const precioMap = parsePrecioMap(rawV);
      const periodo   = detectPeriodoDias(rawV);
      const inactivos = parseInactivos(rawV, rawE);

      msg.textContent = 'Analizando ventas por cliente…';
      const clientes  = parseVclie(rawV, precioMap);

      msg.textContent = 'Calculando R1/R2/R3/R4…';
      const r1 = buildR1(clientes, inv, catalogo, inactivos, precioMap);
      const r2 = buildR2(clientes, inv, catalogo, inactivos, precioMap);
      const r3 = buildR3(clientes, inv, catalogo, inactivos, precioMap);
      const r4 = buildR4(clientes, inv, catalogo);

      msg.textContent = 'Calculando R5 — Sugerido de compra…';
      const r5   = buildR5(clientes, inv, catalogo, inactivos, precioMap, periodo.dias, 0.5, 15);
      const kpis = buildKpis(inv, catalogo, inactivos, clientes, r1, r2, r5);

      window.RB = { inv, catalogo, inactivos, clientes, precioMap, r1, r2, r3, r4, r5, kpis, periodo };
      window.RB._r2pct = 20;
      window.RB._r5lead = 15;
      window.RB._r5factor = 0.5;

      // Exponer recálculo de R5 para los sliders de la UI
      window.recalcularR5 = function (factorSeg, leadTimeDias) {
        if (factorSeg === undefined)   factorSeg   = window.RB._r5factor;
        if (leadTimeDias === undefined) leadTimeDias = window.RB._r5lead;
        window.RB._r5factor = factorSeg;
        window.RB._r5lead   = leadTimeDias;
        window.RB.r5 = buildR5(clientes, inv, catalogo, inactivos, precioMap, periodo.dias, factorSeg, leadTimeDias);
        document.dispatchEvent(new CustomEvent('r5updated', { detail: window.RB.r5 }));
      };

      await new Promise(r => setTimeout(r, 150));
      loader.style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.dispatchEvent(new Event('rbready'));

    } catch (e) {
      msg.textContent = '';
      const d = document.createElement('div');
      d.className = 'err';
      d.innerHTML = '<strong>⚠️ Error</strong><br><br>' + e.message
        + '<br><br><em>Abre la consola del navegador (F12) para más detalles.</em>'
        + '<br><em>Requiere servidor HTTP: python -m http.server 8080 o Live Server.</em>';
      loader.appendChild(d);
      console.error('[RB]', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
