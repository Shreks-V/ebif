# Antipatrones de Software Identificados en el Proyecto EBIF
### Sistema de Gestión para la Asociación de Espina Bífida (EBIF)
**Tecnológico de Monterrey — Ingeniería en Tecnologías de Información**  
**Semestre 6 · Diseño de Software**

---

## 1. Introducción

Un **antipatrón de software** es una respuesta común a un problema recurrente que, a pesar de parecer razonable en un primer momento, resulta contraproducente a largo plazo. A diferencia de los patrones de diseño —que proponen soluciones probadas—, los antipatrones documentan prácticas que generan deuda técnica, dificultan el mantenimiento y reducen la calidad del sistema (Wikipedia, 2024).

En este documento se analizan los antipatrones identificados durante el desarrollo del sistema EBIF, construido con Angular 19 en el frontend, FastAPI + Python 3.12 en el backend y Oracle Database como motor de persistencia. El equipo reflexiona además sobre las habilidades que considera esenciales en un ingeniero de software profesional.

---

## 2. Antipatrones Identificados en el Proyecto EBIF

### 2.1 Blob (God Object) — `exportaciones/repository.py`

**Descripción:** El antipatrón *Blob* ocurre cuando un único módulo o clase concentra demasiadas responsabilidades, volviéndose un "objeto dios" que sabe y hace demasiado.

**Evidencia en el proyecto:**  
El archivo `backend/app/infrastructure/exportaciones/repository.py` alcanzó **1,338 líneas de código** y contiene **57 funciones** que cubren generación de PDFs de reportes, PDFs de credenciales, exportaciones a Excel y múltiples helpers de estilo y layout. Una sola función `_exportar_reporte_pdf` llegó a tener una complejidad cognitiva de **103**, muy por encima del umbral recomendado de 15 (SonarCloud).

**Consecuencia:** Dificultad extrema para probar, entender y modificar el módulo de forma aislada. Cualquier cambio en la lógica de estilos PDF afectaba directamente a la lógica de datos.

**Refactorización aplicada:** Se extrajeron helpers modulares (`_reporte_pdf_styles`, `_reporte_pdf_kpi_table`, `_reporte_pdf_ciudades_rows`, etc.) que separan las preocupaciones y reducen la complejidad de cada función individual.

---

### 2.2 Magic Numbers y Hardcoded Strings

**Descripción:** El antipatrón *Magic Numbers* consiste en usar valores literales sin nombre en el código, lo que oscurece su significado y dificulta los cambios globales.

**Evidencia en el proyecto:**  
Se encontraron más de **20 ocurrencias** de cadenas literales como `'S'`, `'N'`, `'ACTIVO'`, `'CUOTA A'`, `'CUOTA B'` dispersas en los repositorios de reportes y exportaciones. Ejemplo:

```python
# Antipatrón — sin contexto semántico
if _strip(paciente.get('activo')) == 'S':
    ...
if paciente.get('tipo_cuota') == 'CUOTA A':
    ...
```

Estos valores `'S'` y `'N'` representan booleanos del esquema Oracle, y `'CUOTA A'`/`'CUOTA B'` son categorías de membresía, pero un lector nuevo no puede deducirlo sin contexto.

**Consecuencia:** Si la base de datos cambia de `'S'`/`'N'` a `'Y'`/`'N'` o a valores numéricos, habría que hacer búsqueda-reemplazo en múltiples archivos con riesgo de errores.

**Mejora propuesta:** Definir constantes o un `Enum` a nivel de dominio:
```python
class EstadoActivo(str, Enum):
    ACTIVO = 'S'
    INACTIVO = 'N'
```

---

### 2.3 Copy-Paste Programming — Manejo de Excepciones

**Descripción:** El antipatrón *Copy-Paste Programming* ocurre cuando se replica código en lugar de abstraerlo en una función reutilizable, generando duplicación que crece con el tiempo.

**Evidencia en el proyecto:**  
El patrón `try / except Exception / logger.exception / raise InternalError(_MSG_ERROR_INTERNO)` se repite **65 veces** en la capa de infraestructura. Fragmento representativo:

```python
# Repetido ~65 veces con mínimas variaciones
try:
    ...lógica de negocio...
except Exception:
    logger.exception('Error al generar PDF de reportes')
    raise InternalError(_MSG_ERROR_INTERNO)
```

**Consecuencia:** Si se necesita cambiar la política de logging o el tipo de error lanzado, hay que editar decenas de sitios. Además, incrementa la complejidad cognitiva de cada función.

**Mejora propuesta:** Un decorador `@handle_infra_errors("contexto")` que encapsule el patrón.

---

### 2.4 Lava Flow — Directiva `appKeyboardClick` Reemplazada

**Descripción:** El antipatrón *Lava Flow* describe código que fue escrito con una intención específica, luego quedó obsoleto por cambios en el diseño, pero permanece en el sistema porque "funciona" y nadie se atreve a eliminarlo.

**Evidencia en el proyecto:**  
La directiva `KeyboardClickDirective` (`appKeyboardClick`) fue creada para agregar accesibilidad de teclado a elementos `<div>` con `role="button"`. Sin embargo, cuando SonarCloud marcó todos esos patrones como issues de accesibilidad (regla `Web:S6819`), el enfoque correcto resultó ser simplemente **quitar** el `role="button"` y usar `(keydown)` directo. La directiva quedó registrada en el módulo pero sin usarse en ningún template HTML.

**Consecuencia:** Código muerto que confunde a nuevos integrantes del equipo que ven la directiva en el módulo sin entender por qué existe.

---

### 2.5 Spaghetti Code — Templates HTML con Lógica de Negocio Inline

**Descripción:** El antipatrón *Spaghetti Code* describe código con estructura de control tan compleja y entrelazada que resulta difícil de seguir y modificar.

**Evidencia en el proyecto:**  
El template `nuevo-cobro.component.html` tiene **284 líneas** con lógica de negocio directamente en el HTML: cálculos de totales, validaciones de formulario y manejo de estados embebidos en expresiones de template. Esto mezcla la capa de presentación con reglas de negocio.

```html
<!-- Lógica de negocio en el template -->
@if (renovarExento !== 'S') {
  @for (mp of renovarMetodosPago; track mp; let i = $index) {
    <!-- 40+ líneas de lógica anidada -->
  }
}
```

**Consecuencia:** Los templates son difíciles de testear, difíciles de reutilizar y cualquier cambio en la lógica de negocio requiere editar el HTML.

**Mejora propuesta:** Mover la lógica compleja al componente TypeScript y exponer solo propiedades/métodos simples al template.

---

## 3. Habilidades del Ingeniero de Software — Opinión del Equipo

> *Cada integrante del equipo comparte su perspectiva individual sobre las habilidades esenciales en un ingeniero de software moderno.*

---

### Marco Torres
Para mí, la habilidad más importante que debe tener un ingeniero de software es la **capacidad de aprender continuamente**. La tecnología cambia a una velocidad brutal y lo que aprendiste hace dos años puede quedar obsoleto. Pero más allá de las habilidades técnicas concretas —dominar un lenguaje, un framework o una arquitectura—, creo que lo que realmente distingue a un buen ingeniero es saber leer código que no escribiste, entender sistemas que heredaste y comunicar tus decisiones técnicas a personas no técnicas. En este proyecto me quedó muy claro que escribir código que funcione es solo el punto de partida; el reto real es escribir código que otros puedan mantener.

---

### Diego Guadiana
En mi opinión, un ingeniero de software debe tener una combinación sólida de **pensamiento sistemático y empatía con el usuario final**. Durante el desarrollo de EBIF, muchas de nuestras decisiones técnicas tenían impacto directo en personas con discapacidades y sus familias. Eso me hizo ver que la ingeniería de software no es solo resolver problemas técnicos; es entender el contexto humano del sistema que construyes. Técnicamente, valoraría mucho el dominio de patrones de diseño y la capacidad de revisar el trabajo propio con ojo crítico —exactamente lo que se hace cuando identificas antipatrones.

---

### Ricardo Basurto
Yo creo firmemente que la **disciplina de calidad** es la habilidad más subestimada. Muchos estudiantes (yo incluido al principio) vemos las pruebas unitarias, el análisis estático y las revisiones de código como burocracia. Pero en este proyecto, tener 232 pruebas automatizadas nos salvó múltiples veces de romper funcionalidad existente al refactorizar. Un ingeniero de software maduro entiende que la velocidad de desarrollo sostenible depende directamente de la calidad del código base.

---

### Emilio Peralta
Para mí, lo más valioso es la **capacidad de colaboración y comunicación técnica**. En un equipo de cinco personas trabajando sobre el mismo sistema, la habilidad de expresar claramente por qué tomaste una decisión arquitectónica —ya sea en un commit, en un comentario de código o en una reunión— es tan importante como la habilidad de tomar la decisión correcta. He visto cómo decisiones técnicas buenas fallan porque nadie más del equipo las entendió, y decisiones mediocres sobreviven porque fueron bien comunicadas.

---

### Erick Ramírez
Mi perspectiva es que un ingeniero de software debe desarrollar especialmente el **pensamiento de largo plazo**. Es muy fácil escribir la solución que funciona hoy sin pensar en cómo va a escalar, cómo se va a mantener o cómo la va a entender alguien más en seis meses. Los antipatrones que identificamos en nuestro propio proyecto —el Blob, el Copy-Paste— no nacieron de descuido; nacieron de priorizar la entrega rápida sobre la sostenibilidad. Un buen ingeniero aprende a negociar esa tensión desde el principio.

---

## 4. Reflexión Final

La identificación de antipatrones en el proyecto EBIF no es un ejercicio de crítica sino de madurez técnica. Reconocer que un módulo de 1,338 líneas es un *Blob*, que un patrón repetido 65 veces es *Copy-Paste Programming*, o que una directiva sin uso es *Lava Flow*, es exactamente el tipo de pensamiento crítico que distingue al ingeniero que simplemente entrega código del que construye sistemas mantenibles.

El proceso de refactorización que siguió a cada identificación —extraer helpers, definir constantes, eliminar código muerto— demostró en la práctica que los antipatrones no son sentencias permanentes, sino deuda técnica que puede pagarse gradualmente con disciplina y criterio.

---

## Referencias

- Wikipedia. (2024). *Antipatrón de diseño*. https://es.wikipedia.org/wiki/Antipatr%C3%B3n_de_dise%C3%B1o
- Brown, W. J., Malveau, R. C., McCormick, H. W., & Mowbray, T. J. (1998). *AntiPatterns: Refactoring Software, Architectures, and Projects in Crisis*. Wiley.
- Autentia / Izertis. (2024). *Antipatrones de Software: Los más comunes*. https://www.izertis.com/es/
- SonarCloud. (2024). *Cognitive Complexity — A new way of measuring understandability*. SonarSource.
- Martin, R. C. (2008). *Clean Code: A Handbook of Agile Software Craftsmanship*. Prentice Hall.
