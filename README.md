# 🤖 Robot Sugerido de Compra — Grupo Águila

Dashboard interactivo que lee **ROBOTBETO.xlsx** y genera automáticamente los 3 análisis de sugerido de compra por cliente.

---

## 🚀 Cómo usar en GitHub Pages

1. Sube este repo a GitHub
2. **Settings → Pages → Branch: main → Save**
3. Abre: `https://tu-usuario.github.io/robot-sugerido/`

## 🔄 Actualizar datos

Solo reemplaza **`data/ROBOTBETO.xlsx`** y haz commit. El dashboard se recalcula automáticamente.

## 📁 Estructura

```
robot-sugerido/
├── index.html
├── data/
│   └── ROBOTBETO.xlsx   ← ⭐ Solo reemplaza este
└── assets/
    ├── parser.js         ← Lee las 4 hojas y calcula los 3 análisis
    ├── charts.js         ← Gráficas Chart.js
    ├── ui.js             ← KPIs, tablas, filtros
    └── style.css         ← Estilos
```

## 📊 Hojas requeridas en ROBOTBETO.xlsx

| Hoja   | Contenido                              |
|--------|----------------------------------------|
| EXIVAL | Existencia y valor del inventario      |
| VCLIE  | Ventas por cliente (Ene–May)           |
| INA    | Artículos inactivos (sin rotación)     |
| AL     | Catálogo completo con líneas           |

## 🧠 Los 3 Análisis

**R1 — Por Líneas Compradas**
Sugiere artículos activos con stock, en las líneas que el cliente ya trabaja, que no haya comprado en el período.

**R2 — Top 20% Rotación**
Calcula los artículos más vendidos en unidades (top 20%), filtra los que tienen stock y los cruza con el perfil de compra del cliente con un score de rotación (0–10).

**R3 — Líneas No Trabajadas**
Identifica las líneas que el cliente NO compra y sugiere artículos disponibles con cantidad = 20% del stock actual.
