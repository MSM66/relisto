# RELISTO

**Vístete rápido. Dale más vida a tu ropa.**
Descubre qué ponerte con lo que ya tienes y compra con intención.

App web instalable (PWA). Se publica con GitHub Pages desde la carpeta `docs/`.
Tus prendas, historial y fotos se guardan **solo en tu teléfono** (IndexedDB):
este repositorio contiene únicamente el código y datos de demostración ficticios.

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
