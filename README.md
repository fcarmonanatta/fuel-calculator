# Flyzar Fuel Calculator

Herramienta web (un solo archivo, `index.html`) para decidir cargas de combustible:

1. **Punto de equilibrio para waivear** — ¿pago el handling fee o cargo el mínimo del FBO?
2. **Ahorro tankereando** — cuánto se ahorra llevando combustible barato a destinos caros (hasta 5 tramos, con costo de acarreo opcional).
3. **Registro de ahorro** — bitácora de vuelos guardados en el dispositivo, con filtros y exportación a Excel.

No necesita servidor ni build: abrir `index.html` en el navegador o publicarlo tal cual (AI Studio, GitHub Pages, etc.).

## Fórmulas

**Waiver**: el fee equivale a `fee / precio` galones. Punto de equilibrio = `mínimo − fee / precio`.
- Necesitás menos que el equilibrio → pagá el fee y cargá lo justo.
- Entre el equilibrio y el mínimo → cargá el mínimo (sale más barato que fee + lo justo).
- Mínimo o más → fee bonificado.

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
