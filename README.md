# Flyzar Fuel Calculator

Herramienta web (un solo archivo, `index.html`) para decidir cargas de combustible:

1. **Punto de equilibrio para waivear** — ¿pago el handling fee o cargo el mínimo del FBO?
2. **Ahorro tankereando** — cuánto se ahorra llevando combustible barato a destinos caros (hasta 5 tramos, con costo de acarreo opcional).
3. **Registro de ahorro** — bitácora de vuelos guardados en el dispositivo, con filtros y exportación a Excel.

No necesita servidor ni build: abrir `index.html` en el navegador o publicarlo tal cual (AI Studio, GitHub Pages, etc.).

## Aeropuertos

Cada tramo tiene un buscador: se escribe el código OACI, el IATA, la ciudad o el nombre (con o sin tildes) y aparecen las opciones; se elige con el dedo, con Enter o con Tab. Si se escribe un IATA (por ejemplo `EZE`) y se sale del campo, se convierte solo a OACI (`SAEZ`). Un código que no está en la base se acepta igual, con un aviso.

La base viene embebida en `index.html`: funciona sin internet y sin clave de API. Son ~9.300 aeropuertos de [OurAirports](https://ourairports.com/data/) (dominio público): todos los grandes y medianos del mundo más los chicos de Sudamérica con código OACI. A igual coincidencia se priorizan los más grandes y los de Sudamérica.

Para actualizarla: `python3 tools/build_airports.py` (descarga el CSV y reescribe el bloque `airports-data`).

## Identidad visual

Basada en el Brandbook de Flyzar:

- **Paleta**: Dress Blue `#2a3440` (primario) y `#d4d6d4`; secundarios `#1f2426`, `#b0b3b5`, `#e9e9e8`, `#443a37`, `#988d85`, `#d4d2d0`. Los colores de decisión (verde/rojo/ámbar) se usan en tonos apagados para convivir con la paleta.
- **Tipografías**: Proxima Nova (texto) y Tribun italic (acentos). Son de licencia Adobe Fonts; si el dispositivo no las tiene, la app usa Figtree y Newsreader italic de Google Fonts, sus equivalentes libres más cercanos.
- **Logo**: isotipo y logotipo extraídos como vectores del Brandbook, en `brand/` (`flyzar-logo.svg`, `flyzar-lion.svg`, `flyzar-wordmark.svg`, `flyzar-app-icon.png`). En la app van embebidos, sin archivos externos.
- **Modo oscuro** automático según el dispositivo, con botón para forzar claro u oscuro.

## Fórmulas

**Waiver**: el fee equivale a `fee / precio` galones. Punto de equilibrio = `mínimo − fee / precio`.
- Necesitás menos que el equilibrio → pagá el fee y cargá lo justo.
- Entre el equilibrio y el mínimo → cargá el mínimo (sale más barato que fee + lo justo).
- Mínimo o más → fee bonificado.

Opción **"El extra lo aprovecho después"**: los galones que cargás de más para llegar al mínimo quedan en los tanques y no los comprás en tu próxima carga. Cada galón extra cuesta entonces solo `precio − precio_próxima_carga`, y el equilibrio pasa a ser `mínimo − fee / (precio − precio_próxima)`. Si acá el combustible está igual o más barato que en la próxima carga, el equilibrio es 0: siempre conviene llegar al mínimo (verificando capacidad de tanques y pesos).

**Tankering** (por cada tramo A → B):
- `extra = cargado − necesitado` en A.
- Con acarreo: se quema `extra × tasa × horas`; llega `extra × (1 − tasa × horas)`.
- `ahorro = llega × precio_B − extra × precio_A`.
- Precio máximo en A para que convenga: `precio_B × (1 − tasa × horas)`.

## Cambios respecto de la versión original

**Errores corregidos**
- Costo de acarreo: el combustible quemado se valuaba al precio de origen; ahora se valúa al precio de destino, que es el que se deja de ahorrar. Además se aplica a todos los tramos, no solo al primero.
- Las horas de vuelo o la tasa en `0` se reemplazaban por 1,5 / 3,0 en silencio.
- La matrícula ingresada se insertaba como HTML en la bitácora (riesgo de inyección); ahora se escapa.
- Se podía guardar un vuelo vacío (USD 0) en la bitácora.
- "Combustible necesitado" y "cargado" mostraban decimales sin redondear en el resumen.
- CSV: separador `;` y coma decimal para que Excel en español lo abra en columnas; rutas y textos correctamente escapados.
- Fechas en hora local (antes, después de las 21 h en Argentina, se podía guardar el día siguiente).
- `1.500,5` o `1,500.5` ahora se interpretan bien; entradas no numéricas se marcan en rojo.

**Mejoras**
- Waiver: opción "El extra lo aprovecho después" con el precio de la próxima carga.
- Waiver: nuevo campo "¿Cuánto necesitás cargar?" que da la recomendación directa, el costo de cada opción y cuánto se ahorra; la barra ahora es proporcional real y marca dónde caés.
- Tankering: tramos dinámicos (2 a 5), aviso si se cargó menos de lo necesario, alerta de pérdida por tramo, precio máximo en origen para que convenga.
- Densidad configurable (lb/USG) en Ajustes; antes fija en 6,7.
- Guardado de vuelo con formulario (matrícula con sugerencias, vuelo, fecha) en lugar de `prompt()`/`alert()`.
- Bitácora: filtros por matrícula y mes, confirmación antes de borrar, compatible con los registros ya guardados.
- Los datos cargados se conservan al cerrar la app; el botón "atrás" del celular navega entre pantallas.
- Impresión/PDF solo con el análisis (sin botones), accesibilidad (labels, foco visible, `aria-live`).

## Tests

```sh
node --test tests/*.test.mjs
```
