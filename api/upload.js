export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Placeholder: aquí iría la lógica real para subir a Drive/OneDrive
  return res.status(200).json({
    ok: true,
    message: 'Subida simulada. Implementar integración real con Drive/OneDrive.',
    url: 'https://example.com/archivo-simulado.pdf'
  });
}
