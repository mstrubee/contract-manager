import React, { useState, useEffect, useMemo } from "react";

// Contrato Manager — Single-file React component
// - Usa TailwindCSS para estilos (asegúrate de tener Tailwind configurado en tu proyecto)
// - Persiste en localStorage. Para subir archivos a OneDrive/Google Drive, ver las instrucciones al final.

export default function ContractManager() {
  const [contracts, setContracts] = useState(() => {
    try {
      const raw = localStorage.getItem("contracts_v1");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [form, setForm] = useState({
    id: null,
    contractName: "",
    signatureDate: "",
    durationMonths: 12,
    avisoDate: "",
    monthlyAmount: "",
    escalabilidadFixed: 0,
    escalabilidadMonths: 0,
    regimeAmount: "",
    file: null,
  });

  const [escMode, setEscMode] = useState('auto');
  const [manualEscRows, setManualEscRows] = useState([{ mes: 1, monto: "" }]);

  const [sortBy, setSortBy] = useState({ key: 'avisoDate', dir: 'asc' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    localStorage.setItem("contracts_v1", JSON.stringify(contracts));
  }, [contracts]);

  function resetForm() {
    setForm({
      id: null,
      contractName: "",
      signatureDate: "",
      durationMonths: 12,
      avisoDate: "",
      monthlyAmount: "",
      escalabilidadFixed: 0,
      escalabilidadMonths: 0,
      regimeAmount: "",
      file: null,
    });
    setManualEscRows([{ mes: 1, monto: "" }]);
    setEscMode('auto');
  }

  function handleFilePick(file) {
    // guardamos en memoria como objeto con URL para previsualizar.
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm(f => ({ ...f, file: { name: file.name, size: file.size, url } }));
  }

  function saveContract(e) {
    e.preventDefault();
    const id = form.id || Date.now().toString();
    const signature = form.signatureDate ? new Date(form.signatureDate) : null;
    const endDate = signature ? new Date(signature) : null;
    if (endDate) endDate.setMonth(endDate.getMonth() + Number(form.durationMonths));

    const newContract = {
      ...form,
      id,
      signatureDate: form.signatureDate,
      durationMonths: Number(form.durationMonths),
      endDate: endDate ? endDate.toISOString().slice(0,10) : null,
      monthlyAmount: Number(form.monthlyAmount || 0),
      escalabilidadFixed: Number(form.escalabilidadFixed || 0),
      escalabilidadMonths: Number(form.escalabilidadMonths || 0),
      regimeAmount: Number(form.regimeAmount || 0),
      createdAt: new Date().toISOString(),
    };

    setContracts(prev => {
      const filtered = prev.filter(c => c.id !== id);
      return [newContract, ...filtered];
    });
    resetForm();
  }

  function editContract(id) {
    const c = contracts.find(x => x.id === id);
    if (!c) return;
    setForm({ ...c });
  }

  function removeContract(id) {
    if (!confirm('Eliminar contrato?')) return;
    setContracts(prev => prev.filter(c => c.id !== id));
  }

  function daysUntil(dateString) {
    if (!dateString) return Infinity;
    const now = new Date();
    const d = new Date(dateString + 'T00:00:00');
    const diff = Math.ceil((d - now) / (1000*60*60*24));
    return diff;
  }

  function semaphoreColorFor(contract) {
    const days = daysUntil(contract.avisoDate || contract.endDate || '');
    // thresholds: <=7 rojo, <=30 naranja, <=90 amarillo, >90 verde
    if (days <= 7) return 'bg-red-500';
    if (days <= 30) return 'bg-orange-400';
    if (days <= 90) return 'bg-yellow-400';
    return 'bg-green-400';
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = contracts.filter(c => {
      if (!q) return true;
      return [c.id, (c.file && c.file.name) || '', String(c.monthlyAmount)].join(' ').toLowerCase().includes(q);
    });

    const key = sortBy.key;
    list.sort((a,b) => {
      let va = a[key];
      let vb = b[key];
      if (key === 'monthlyAmount' || key === 'durationMonths') {
        va = Number(va||0); vb = Number(vb||0);
      }
      if (key === 'endDate' || key === 'signatureDate' || key === 'avisoDate') {
        va = va ? new Date(va) : new Date(0);
        vb = vb ? new Date(vb) : new Date(0);
      }
      if (va < vb) return sortBy.dir === 'asc' ? -1 : 1;
      if (va > vb) return sortBy.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [contracts, query, sortBy]);

  // semáforo: ordenado desde el más próximo aviso (rojo) al más lejano (verde)
  const semaphoreOrdered = [...contracts].sort((a,b)=> daysUntil(a.avisoDate) - daysUntil(b.avisoDate));

  // cálculo de tabla de escalabilidad (lineal: suma fija mensual o manual)
  const escalabilidadTabla = useMemo(() => {
    if (escMode === 'manual') {
      return manualEscRows
        .filter(r => r.mes !== "" && r.monto !== "")
        .map(r => ({ mes: Number(r.mes), monto: Number(r.monto) }));
    }
    const tabla = [];
    const montoInicial = Number(form.monthlyAmount || 0);
    const incremento = Number(form.escalabilidadFixed || 0);
    const maxMonths = Number(form.escalabilidadMonths || 0);
    const regimen = Number(form.regimeAmount || 0);
    if (!montoInicial || !regimen || !maxMonths) return tabla;
    let monto = montoInicial;
    tabla.push({ mes: 1, monto });
    for (let i = 1; i <= maxMonths; i++) {
      const siguiente = monto + incremento;
      if (siguiente >= regimen) {
        tabla.push({ mes: i + 1, monto: regimen });
        break;
      } else {
        tabla.push({ mes: i + 1, monto: Number(siguiente.toFixed(2)) });
        monto = siguiente;
      }
    }
    return tabla;
  }, [escMode, manualEscRows, form.monthlyAmount, form.escalabilidadFixed, form.escalabilidadMonths, form.regimeAmount]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Gestor de Contratos — locales comerciales</h1>
          <div className="text-right">
            <p className="text-sm text-gray-500">Interfaz limpia tipo Apple — responsive</p>
          </div>
        </header>

        {/* Dashboard: semáforo */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 bg-white p-4 rounded-2xl shadow">
            <h2 className="font-medium mb-3">Semáforo de Avisos (próximos primero)</h2>
            <div className="space-y-3">
              {semaphoreOrdered.length === 0 && <p className="text-gray-500">No hay contratos aún.</p>}
              {semaphoreOrdered.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${semaphoreColorFor(c)}`} />
                    <div>
                      <div className="font-medium">{c.contractName || ('Contrato #' + c.id.slice(-6))}</div>
                      <div className="text-sm text-gray-500">
                      Inicio: {c.signatureDate || '—'} • <span className="font-semibold">Aviso: {c.avisoDate || '—'}</span> • Término: {c.endDate || '—'}
                    </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Dias: {isFinite(daysUntil(c.avisoDate)) ? daysUntil(c.avisoDate) : '—'}</div>
                    <div className="text-xs text-gray-400">Monto: ${Number(c.monthlyAmount||0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h3 className="font-medium mb-3">Resumen</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>Total contratos: <strong>{contracts.length}</strong></div>
              <div>Monto mensual total: <strong>${contracts.reduce((s,c)=>s + Number(c.monthlyAmount||0),0).toLocaleString()}</strong></div>
              <div>Contratos con archivo: <strong>{contracts.filter(c=>c.file).length}</strong></div>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          {/* Form */}
          <form className="md:col-span-1 bg-white p-4 rounded-2xl shadow" onSubmit={saveContract}>
            <h3 className="font-medium mb-3">Agregar / Editar contrato</h3>

            <label className="block text-sm">Nombre del contrato</label>
            <input type="text" value={form.contractName || ""} onChange={e=>setForm(f=>({...f, contractName: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Fecha Firma</label>
            <input type="date" value={form.signatureDate} onChange={e=>setForm(f=>({...f, signatureDate: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Duración (meses)</label>
            <input type="number" min={1} value={form.durationMonths} onChange={e=>setForm(f=>({...f, durationMonths: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Fecha de Aviso término anticipado</label>
            <input type="date" value={form.avisoDate} onChange={e=>setForm(f=>({...f, avisoDate: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Monto canon mes 1</label>
            <input type="number" value={form.monthlyAmount} onChange={e=>setForm(f=>({...f, monthlyAmount: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Incremento fijo por mes (ej. 2.5)</label>
            <input type="number" step="0.01" value={form.escalabilidadFixed} onChange={e=>setForm(f=>({...f, escalabilidadFixed: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Meses máximos de escalabilidad</label>
            <input type="number" value={form.escalabilidadMonths} onChange={e=>setForm(f=>({...f, escalabilidadMonths: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Monto régimen</label>
            <input type="number" value={form.regimeAmount} onChange={e=>setForm(f=>({...f, regimeAmount: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />

            <label className="block text-sm">Repositorio (archivo)</label>
            <input type="file" onChange={e=>handleFilePick(e.target.files?.[0])} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1 mb-3" />
            {form.file && <div className="text-xs text-gray-500 mb-2">Archivo: {form.file.name} • <a className="underline" href={form.file.url} target="_blank" rel="noreferrer">Previsualizar</a></div>}

            <div className="flex gap-2 mt-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border rounded">Limpiar</button>
            </div>

            <p className="text-xs text-gray-400 mt-3">Nota: para guardar archivos en OneDrive/Google Drive necesita integrar la API en el servidor o frontend con OAuth. Hay instrucciones al final del archivo.</p>
          </form>

          {/* Tabla de escalabilidad */}
          <div className="mt-6 bg-white p-4 rounded-2xl shadow">
            <h3 className="font-medium mb-3">Escalabilidad mes a mes</h3>
            <div className="mb-3 text-xs text-gray-600 flex items-center gap-2">
              <span className="font-semibold">Modo:</span>
              <button
                type="button"
                onClick={() => setEscMode('auto')}
                className="px-2 py-1 border rounded text-xs"
              >
                Automático
              </button>
              <button
                type="button"
                onClick={() => setEscMode('manual')}
                className="px-2 py-1 border rounded text-xs"
              >
                Manual
              </button>
            </div>
            {escMode === 'manual' && (
              <div className="mb-3 text-xs text-gray-600">
                <p className="mb-2">Ingrese los meses y montos manualmente:</p>
                <table className="w-full text-left text-xs mb-2">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="py-1">Mes</th>
                      <th className="py-1">Monto</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualEscRows.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            className="w-full border rounded px-1 py-0.5"
                            value={row.mes}
                            onChange={e => {
                              const val = e.target.value;
                              setManualEscRows(rows => rows.map((r, i) => i === idx ? { ...r, mes: val } : r));
                            }}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            className="w-full border rounded px-1 py-0.5"
                            value={row.monto}
                            onChange={e => {
                              const val = e.target.value;
                              setManualEscRows(rows => rows.map((r, i) => i === idx ? { ...r, monto: val } : r));
                            }}
                          />
                        </td>
                        <td className="py-1">
                          {manualEscRows.length > 1 && (
                            <button
                              type="button"
                              className="text-red-500 text-xs"
                              onClick={() => setManualEscRows(rows => rows.filter((_, i) => i !== idx))}
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="text-xs px-2 py-1 border rounded"
                  onClick={() => setManualEscRows(rows => [...rows, { mes: (rows[rows.length - 1]?.mes || 0) + 1, monto: "" }])}
                >
                  + Agregar fila
                </button>
              </div>
            )}
            {escalabilidadTabla.length === 0 ? (
              <p className="text-gray-500 text-sm">Ingrese los datos del contrato (nombre, montos y escalabilidad) para ver el detalle mes a mes.</p>
            ) : (
              <>
                <div className="text-xs text-gray-600 mb-3 space-y-1">
                  <div><strong>Contrato:</strong> {form.contractName || '—'}</div>
                  <div><strong>Firma:</strong> {form.signatureDate || '—'} • <strong>Duración:</strong> {form.durationMonths || '—'} meses</div>
                  <div><strong>Aviso término:</strong> {form.avisoDate || '—'}</div>
                  <div><strong>Monto mes 1:</strong> ${Number(form.monthlyAmount || 0).toLocaleString()} • <strong>Incremento fijo:</strong> {form.escalabilidadFixed || 0}</div>
                  <div><strong>Meses máx. escalabilidad:</strong> {form.escalabilidadMonths || 0} • <strong>Monto régimen:</strong> ${Number(form.regimeAmount || 0).toLocaleString()}</div>
                </div>
                <table className="w-full text-left text-sm">
                <thead className="text-gray-500">
                  <tr><th className="py-1">Mes</th><th className="py-1">Monto</th></tr>
                </thead>
                <tbody>
                  {escalabilidadTabla.map(r => (
                    <tr key={r.mes} className="border-t">
                      <td className="py-1">{r.mes}</td>
                      <td className="py-1">${r.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>

          {/* Table / list */}
          <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Contratos</h3>
              <div className="flex gap-2">
                <input placeholder="buscar" value={query} onChange={e=>setQuery(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                <select value={sortBy.key} onChange={e=>setSortBy(s=>({...s, key:e.target.value}))} className="px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                  <option value="avisoDate">Fecha Aviso</option>
                  <option value="endDate">Fecha Término</option>
                  <option value="durationMonths">Duración</option>
                  <option value="signatureDate">Fecha Firma</option>
                  <option value="monthlyAmount">Monto</option>
                </select>
                <button onClick={()=>setSortBy(s=>({...s, dir: s.dir==='asc' ? 'desc' : 'asc'}))} className="px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">{sortBy.dir==='asc' ? '▲' : '▼'}</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-sm text-gray-500">
                  <tr>
                    <th className="py-2">Semáforo</th>
                    <th className="py-2">Contrato</th>
                    <th className="py-2">Firma</th>
                    <th className="py-2">Aviso</th>
                    <th className="py-2">Término</th>
                    <th className="py-2">Durac.</th>
                    <th className="py-2">Monto</th>
                    <th className="py-2">Archivo</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c=> (
                    <tr key={c.id} className="border-t align-top">
                      <td className="py-3"><div className={`w-4 h-4 rounded-full ${semaphoreColorFor(c)}`}></div></td>
                      <td className="py-3">{c.contractName || ('#' + c.id.slice(-6))}</td>
                      <td className="py-3">{c.signatureDate || '—'}</td>
                      <td className="py-3">{c.avisoDate || '—'}</td>
                      <td className="py-3">{c.endDate || '—'}</td>
                      <td className="py-3">{c.durationMonths}</td>
                      <td className="py-3">${Number(c.monthlyAmount||0).toLocaleString()}</td>
                      <td className="py-3">{c.file ? <a className="underline" href={c.file.url} target="_blank" rel="noreferrer">{c.file.name}</a> : '—'}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={()=>editContract(c.id)} className="px-2 py-1 border rounded text-sm">Editar</button>
                          <button onClick={()=>removeContract(c.id)} className="px-2 py-1 border rounded text-sm">Eliminar</button>
                          <button onClick={()=>downloadAsJson(c)} className="px-2 py-1 border rounded text-sm">Descargar JSON</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && <div className="text-center text-gray-400 p-6">Sin resultados</div>}
            </div>

          </div>
        </section>

      </div>
    </div>
  );

  // ----- funciones auxiliares locales (definidas después del return para claridad) -----
  function downloadAsJson(contract) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contract, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `contract-${contract.id}.json`);
    dl.click();
  }
}

/*
  INTEGRACIÓN CON NUBE (OneDrive / Google Drive) — GUÍA RÁPIDA

  Opciones:
  1) Subida desde frontend (solo para aplicaciones SPA con OAuth):
     - Registrar la app en Google Cloud Console o Microsoft Azure (OneDrive).
     - Usar OAuth2 para obtener token y luego llamar a las APIs de Drive/OneDrive.
     - Google Drive: PUT/POST multipart upload a https://www.googleapis.com/upload/drive/v3/files
     - OneDrive: PUT a https://graph.microsoft.com/v1.0/me/drive/root:/path/filename:/content
     - Requiere HTTPS y manejo de tokens. No apto para apps estáticas sin backend seguro.

  2) Subida vía servidor (recomendado):
     - Usuario sube archivo al backend (Node/Express, Python, etc.).
     - Backend usa credenciales de servicio o flujo OAuth para escribir en la carpeta de la nube.
     - Es más seguro porque no expones client secrets.

  3) Enlace a carpeta sincronizada localmente:
     - Si el servidor tiene una carpeta sincronizada con OneDrive/Drive, guarda ahí el archivo y guarda la URL pública o ruta.

  Ejemplo práctico (frontend):
    - Al guardar archivo en el formulario, haz POST a tu endpoint /upload.
    - Backend recibe multipart/form-data, escribe archivo en disco/s3/drive y responde con URL.
    - Guarda la URL en el contrato (campo file.url).

  Si quieres, puedo:
   - Generar un ejemplo de backend en Node.js/Express que reciba el archivo y lo suba a OneDrive o Google Drive.
   - O bien, preparar un ZIP con este componente + instrucciones de despliegue.
*/
