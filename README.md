# RELISTO

**Vístete rápido. Dale más vida a tu ropa.**
Descubre qué ponerte con lo que ya tienes y compra con intención.

App web instalable (PWA). Se publica con GitHub Pages desde la carpeta `docs/`.
Cada persona crea su cuenta **en su propio teléfono** con su DNI (o carné de extranjería)
y una contraseña. Su armario y sus fotos se guardan cifrados (AES-GCM; clave envuelta con
PBKDF2-SHA-256 y con un código de recuperación) en el almacenamiento del navegador (IndexedDB).
Nada se envía a un servidor y el documento no se valida con RENIEC. Este repositorio contiene
únicamente el código y datos de demostración ficticios.

Para compartir RELISTO, envía el enlace del sitio: cada persona la instala y crea su cuenta.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/` | Código fuente: datos de demo, reglas puras, ilustraciones, operaciones, pruebas e interfaz |
| `pwa-src/` | Manifiesto, service worker, ícono |
| `build.sh` | Genera `docs/` (app instalable) y `artifact/relisto.html` (versión para Claude) |
| `docs/` | Sitio publicado en GitHub Pages |

## Publicar un cambio

```sh
./build.sh        # requiere Node con el paquete sharp para los íconos
git add -A && git commit -m "…" && git push
```

GitHub Pages se actualiza en uno o dos minutos y la app instalada muestra
«Hay una versión nueva de RELISTO».
