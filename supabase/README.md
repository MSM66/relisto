# RELISTO · Supabase

- `migrations/`: esquema (armario, vitrina, reportes, bloqueos), fotos en Storage y ajustes de seguridad. Ya aplicadas en el proyecto `ymarbfgxwlsyovlradpr`.
- `config.json`: dirección del proyecto y clave **publicable** (es pública por diseño; la seguridad la dan las reglas RLS y las funciones del servidor). `owner` y `contact` aparecen en la política de privacidad.
- `test/`: Postgres local + servidor simulado para probar la app sin tocar el proyecto real (`flow.sql`, `mock-server.js`).

Ajustes que se hacen en el panel de Supabase (no por SQL):
1. Authentication → Sign In / Providers → Email: desactivar **Confirm email** mientras no haya SMTP propio.
2. Authentication → URL Configuration: Site URL `https://msm66.github.io/relisto/` y agregarla en Redirect URLs.
3. Para producción: SMTP propio (por ejemplo Resend) en Authentication → Emails → SMTP Settings.
