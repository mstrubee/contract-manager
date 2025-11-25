# Gestor de Contratos — Vercel + Vite + React + Tailwind v3

## 1. Instalación local

```bash
npm install
npm run dev
```

Abre: http://localhost:5173

## 2. Pegar el componente ContractManager

1. Abre `src/ContractManager.jsx`
2. Borra TODO el contenido placeholder
3. Pega el componente completo que tienes en el canvas de ChatGPT
4. Guarda el archivo, Vite recargará solo

## 3. Deploy en Vercel

1. Sube esta carpeta a un repo de GitHub (por ejemplo, `contract-manager-vercel-v3`)
2. Entra a https://vercel.com
3. "Add New Project" → importa el repo
4. Vercel detectará Vite automáticamente
5. Usa:
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Deploy y listo: tendrás una URL pública

