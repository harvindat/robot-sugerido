/* ═══════════════════════════════════════════════════════════
   parser.js  —  Lee ROBOTBETO.xlsx y genera los 3 análisis
   Expone: window.RB = { inv, catalogo, inactivos, clientes,
                         r1, r2, r3, kpis }
   ═══════════════════════════════════════════════════════════ */
(function () {

  function pn(v) {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(String(v).replace(/[,$]/g, '').trim());
    return isNaN(n) ? 0 : n;
  }
  function ps(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
  function arr2d(ws) { return XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true }); }

  /* ── EXIVAL ─ inventario actual ─────────────────────── */
  function parseExival(wb) {
    const raw = arr2d(wb.Sheets['EXIVAL']);
    const inv = {};
    for (let i = 6; i < raw.length; i++) {
      const clave = ps(raw[i][0]);
      if (!clave) continue;
      inv[clave] = { exist: pn(raw[i][3]), desc: ps(raw[i][1]) };
    }
    return inv;
  }

  /* ── AL ─ catálogo con líneas ───────────────────────── */
  function parseCatalogo(wb) {
    const raw = arr2d(wb.Sheets['AL']);
    const cat = {};
    for (let i = 1; i < raw.length; i++) {
      const clave = ps(raw[i][0]);
      if (!clave) continue;
      cat[clave] = {
        desc:   ps(raw[i][1]),
        linea:  ps(raw[i][2]),
        estatus:ps(raw[i][9]),
        ult_compra: ps(raw[i][8]),
      };
    }
    return cat;
  }

  /* ── INA ─ artículos inactivos ──────────────────────── */
  function parseInactivos(wb) {
    const raw = arr2d(wb.Sheets['INA']);
    const ina = new Set();
    for (let i = 5; i < raw.length; i++) {
      const c = ps(raw[i][0]);
      if (c) ina.add(c);
    }
    return ina;
  }

  /* ── VCLIE ─ ventas por cliente ─────────────────────── */
  function parseVclie(wb) {
    const raw = arr2d(wb.Sheets['VCLIE']);
    // filas donde col[3] tiene nombre de cliente
    const cliRows = raw.map((r,i) => ({i, nombre: ps(r[3])}))
                       .filter(x => x.nombre && x.nombre !== 'nan' && x.nombre !== 'Cliente');

    const clientes = [];
    cliRows.forEach((cr, idx) => {
      const fin  = idx + 1 < cliRows.length ? cliRows[idx+1].i : raw.length;
      const arts = [];
      for (let j = cr.i + 2; j < fin; j++) {
        const r    = raw[j];
        const clave = ps(r[0]);
        if (!clave || isNaN(pn(r[12])) || r[12] === null) continue;
        arts.push({ clave, desc: ps(r[4]), venta: pn(r[12]), uds: pn(r[14]) });
      }
      clientes.push({
        id: ps(raw[cr.i][0]),
        nombre: cr.nombre,
        arts,
        ventaTotal: arts.reduce((s, a) => s + a.venta, 0),
        udsTotal:   arts.reduce((s, a) => s + a.uds,   0),
      });
    });
    return clientes;
  }

  /* ── ANÁLISIS R1 ─ sugerido por líneas compradas ────── */
  function buildR1(clientes, inv, catalogo, inactivos) {
    const activos = new Set(
      Object.keys(inv).filter(k => inv[k].exist > 0 && !inactivos.has(k))
    );

    return clientes.map(cli => {
      const compradas = new Set(cli.arts.map(a => catalogo[a.clave]?.linea).filter(Boolean));
      const yaCompro  = new Set(cli.arts.map(a => a.clave));

      // Sugeridos: activos, en líneas que compra, que no haya comprado
      const sugeridos = [...activos].filter(k => {
        const linea = catalogo[k]?.linea;
        return linea && compradas.has(linea) && !yaCompro.has(k);
      }).map(k => ({
        clave: k,
        desc:  catalogo[k].desc,
        linea: catalogo[k].linea,
        exist: inv[k].exist,
      }));

      return {
        nombre:    cli.nombre,
        ventaTotal:cli.ventaTotal,
        lineasCompra: [...compradas],
        sugeridos,
      };
    });
  }

  /* ── ANÁLISIS R2 ─ top 20% rotación ─────────────────── */
  function buildR2(clientes, inv, catalogo, inactivos) {
    // Consolidar unidades vendidas por artículo en todo el período
    const rotMap = {};
    clientes.forEach(cli => {
      cli.arts.forEach(a => {
        rotMap[a.clave] = (rotMap[a.clave] || 0) + a.uds;
      });
    });

    // Ordenar y tomar top 20%
    const sorted   = Object.entries(rotMap).sort((a,b) => b[1]-a[1]);
    const top20n   = Math.ceil(sorted.length * 0.20);
    const top20set = new Set(sorted.slice(0, top20n).map(x => x[0]));

    // Top 20% con stock y activos
    const sugeribles = [...top20set].filter(k => inv[k]?.exist > 0 && !inactivos.has(k));
    const sugSet     = new Set(sugeribles);

    // Score de rotación (rango 1-10)
    const maxRot = sorted[0]?.[1] || 1;
    const scoreMap = {};
    sorted.forEach(([k, v], i) => {
      scoreMap[k] = { score: +(v / maxRot * 10).toFixed(1), rank: i + 1, uds: v };
    });

    return clientes.map(cli => {
      const compradas = new Set(cli.arts.map(a => catalogo[a.clave]?.linea).filter(Boolean));
      const yaCompro  = new Set(cli.arts.map(a => a.clave));

      const sugeridos = sugeribles.filter(k => {
        const linea = catalogo[k]?.linea;
        return linea && compradas.has(linea) && !yaCompro.has(k);
      }).map(k => ({
        clave: k,
        desc:  catalogo[k].desc,
        linea: catalogo[k].linea,
        exist: inv[k].exist,
        score: scoreMap[k]?.score || 0,
        rank:  scoreMap[k]?.rank  || 0,
        udsTotal: rotMap[k] || 0,
      })).sort((a,b) => b.score - a.score);

      return {
        nombre:    cli.nombre,
        ventaTotal:cli.ventaTotal,
        lineasCompra: [...compradas],
        sugeridos,
        scoreMap,
      };
    });
  }

  /* ── ANÁLISIS R3 ─ líneas NO trabajadas ─────────────── */
  function buildR3(clientes, inv, catalogo, inactivos) {
    const todasLineas = [...new Set(
      Object.values(catalogo).map(v => v.linea).filter(Boolean)
    )].sort();

    const activos = new Set(
      Object.keys(inv).filter(k => inv[k].exist > 0 && !inactivos.has(k))
    );

    return clientes.map(cli => {
      const compradas  = new Set(cli.arts.map(a => catalogo[a.clave]?.linea).filter(Boolean));
      const faltantes  = todasLineas.filter(l => !compradas.has(l));

      const sugeridos = [...activos].filter(k => {
        const linea = catalogo[k]?.linea;
        return linea && faltantes.includes(linea);
      }).map(k => ({
        clave:  k,
        desc:   catalogo[k].desc,
        linea:  catalogo[k].linea,
        exist:  inv[k].exist,
        sug20:  Math.max(1, Math.ceil(inv[k].exist * 0.20)),
      })).sort((a,b) => a.linea.localeCompare(b.linea) || a.clave.localeCompare(b.clave));

      return {
        nombre:    cli.nombre,
        ventaTotal:cli.ventaTotal,
        lineasCompra: [...compradas],
        lineasFaltantes: faltantes,
        sugeridos,
        totalPiezas: sugeridos.reduce((s,a) => s + a.sug20, 0),
      };
    });
  }

  /* ── KPIs globales ──────────────────────────────────── */
  function buildKpis(inv, catalogo, inactivos, clientes, r1, r2) {
    const totalStock    = Object.values(inv).reduce((s,v) => s+v.exist, 0);
    const artsConStock  = Object.values(inv).filter(v => v.exist > 0).length;
    const ventaTotal    = clientes.reduce((s,c) => s + c.ventaTotal, 0);
    const udsTotal      = clientes.reduce((s,c) => s + c.udsTotal,   0);

    const rotMap = {};
    clientes.forEach(cli => cli.arts.forEach(a => {
      rotMap[a.clave] = (rotMap[a.clave] || 0) + a.uds;
    }));
    const sorted  = Object.entries(rotMap).sort((a,b)=>b[1]-a[1]);
    const top20n  = Math.ceil(sorted.length * 0.20);
    const sugerR1 = r1.reduce((s,c) => s + c.sugeridos.length, 0);
    const sugerR2 = r2.reduce((s,c) => s + c.sugeridos.length, 0);

    // Ventas por línea
    const ventaLinea = {};
    clientes.forEach(cli => cli.arts.forEach(a => {
      const linea = catalogo[a.clave]?.linea || 'SIN LÍNEA';
      ventaLinea[linea] = (ventaLinea[linea] || 0) + a.venta;
    }));

    // Top clientes
    const topClientes = [...clientes].sort((a,b) => b.ventaTotal - a.ventaTotal);

    return {
      totalStock, artsConStock,
      totalArts:      Object.keys(inv).length,
      inactivosN:     inactivos.size,
      ventaTotal,     udsTotal,
      artsVendidos:   sorted.length,
      top20n,         sugerR1, sugerR2,
      rotPct:         +(udsTotal / totalStock * 100).toFixed(1),
      ventaLinea,     topClientes,
    };
  }

  /* ── Carga principal ─────────────────────────────────── */
  async function load() {
    const loader = document.getElementById('loader');
    const msg    = loader.querySelector('p');
    try {
      msg.textContent = 'Cargando ROBOTBETO.xlsx…';
      const resp = await fetch('./data/ROBOTBETO.xlsx');
      if (!resp.ok) throw new Error('No se pudo cargar data/ROBOTBETO.xlsx (HTTP '+resp.status+')');

      msg.textContent = 'Leyendo inventario…';
      const buf = await resp.arrayBuffer();
      const wb  = XLSX.read(buf, { type:'array', raw:true, cellDates:false });

      msg.textContent = 'Procesando catálogo…';
      const inv       = parseExival(wb);
      const catalogo  = parseCatalogo(wb);
      const inactivos = parseInactivos(wb);

      msg.textContent = 'Analizando ventas…';
      const clientes  = parseVclie(wb);

      msg.textContent = 'Calculando sugeridos…';
      const r1 = buildR1(clientes, inv, catalogo, inactivos);
      const r2 = buildR2(clientes, inv, catalogo, inactivos);
      const r3 = buildR3(clientes, inv, catalogo, inactivos);
      const kpis = buildKpis(inv, catalogo, inactivos, clientes, r1, r2);

      window.RB = { inv, catalogo, inactivos, clientes, r1, r2, r3, kpis };

      await new Promise(r => setTimeout(r, 150));
      loader.style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.dispatchEvent(new Event('rbready'));

    } catch(e) {
      msg.textContent = '';
      const d = document.createElement('div');
      d.className = 'err';
      d.innerHTML = '<strong>⚠️ Error</strong><br><br>'+e.message
        +'<br><br><em>Usa GitHub Pages, python -m http.server 8080, o Live Server en VS Code.</em>';
      loader.appendChild(d);
      console.error(e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
