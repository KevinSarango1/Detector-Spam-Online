/**
 * Analiza el contenido ingresado por el usuario (texto, archivo o imagen)
 * para determinar si es SPAM, sospechoso o limpio.
 */
async function analyzeSpam() {
    // Obtener entradas del DOM
    const textAreaText = document.getElementById('textInput').value.toLowerCase();
    const file = document.getElementById('fileInput').files[0];
    const image = document.getElementById('imageInput').files[0];
    const resultsDiv = document.getElementById('results');

    /**
     * Muestra los resultados con estilos personalizados según el puntaje.
     * @param {string} bg - Color de fondo.
     * @param {string} border - Estilo del borde izquierdo.
     * @param {string} msg - Mensaje HTML para mostrar.
     */
    function setResult(bg, border, msg) {
        resultsDiv.style.background = bg;
        resultsDiv.style.borderLeft = border;
        resultsDiv.innerHTML = msg;
    }

    // Mostrar mensaje de "Analizando..."
    resultsDiv.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
        <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f50e.svg" alt="" style="width:1.2em;vertical-align:middle;">
        Analizando${image ? " imagen (esto puede tardar unos segundos)..." : "..."}</span>`;
    resultsDiv.style.background = "#f0f0f0";
    resultsDiv.style.borderLeft = "none";

    let totalText = textAreaText;

    // Patrones frecuentes de spam con pesos heurísticos
    const spamPatterns = [
        { pattern: /gratis/, weight: 3 },
        { pattern: /haz clic/, weight: 3 },
        { pattern: /dinero/, weight: 2 },
        { pattern: /urgente/, weight: 2 },
        { pattern: /oferta/, weight: 2 },
        { pattern: /exclusiva/, weight: 2 },
        { pattern: /\$\d+/, weight: 2 },
        { pattern: /\biphone\b/, weight: 2 },
        { pattern: /\bsamsung\b/, weight: 2 },
        { pattern: /\bgalaxy\b/, weight: 2 },
        { pattern: /\b[A-Z]{4,}\b/, weight: 1 }, // Mayúsculas como grito publicitario
    ];

    /**
     * Extrae texto desde un archivo PDF usando PDF.js
     * @param {File} file - Archivo PDF.
     * @returns {Promise<string>} Texto extraído en minúsculas.
     */
    async function extractTextFromPDF(file) {
        const reader = new FileReader();
        return new Promise(resolve => {
            reader.onload = async function () {
                try {
                    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(reader.result) }).promise;
                    let text = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map(i => i.str).join(" ");
                    }
                    resolve(text.toLowerCase());
                } catch (e) {
                    resolve("");
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extrae texto desde una imagen usando OCR (Tesseract.js).
     * Incluye timeout de 30 segundos como fallback.
     * @param {File} image - Imagen cargada.
     * @returns {Promise<string>} Texto extraído.
     */
    async function extractTextFromImage(image) {
        return Promise.race([
            Tesseract.recognize(image, 'eng', { logger: m => {} })
                .then(result => result.data.text.toLowerCase())
                .catch(() => ""),
            new Promise(resolve => setTimeout(() => resolve(""), 30000))
        ]);
    }

    /**
     * Calcula un puntaje de spam basado en patrones y metadatos del archivo.
     * Luego muestra el resultado en pantalla.
     * @param {string} text - Texto total a analizar.
     * @param {File} file - Archivo cargado.
     * @param {File} image - Imagen cargada.
     */
    function computeScore(text, file, image) {
        let score = 0;
        spamPatterns.forEach(rule => {
            if (rule.pattern.test(text)) score += rule.weight;
        });

        // Penalización por tipos de archivo no estándar
        if (file && !['application/pdf', 'text/plain'].includes(file.type)) score += 2;

        // Penalización por imágenes sospechosas
        if (image) {
            if (image.size > 5 * 1024 * 1024) score += 2;
            if (/gratis|promo|win/.test(image.name.toLowerCase())) score += 2;
        }

        // Mostrar resultado basado en puntaje total
        if (score >= 5) {
            setResult("#ffe6e6", "6px solid #cc0000", `🚫 Este contenido fue clasificado como <strong>SPAM</strong>. (Puntaje: ${score})`);
        } else if (score >= 3) {
            setResult("#fff9e6", "6px solid #e6b800", `⚠️ Contenido <strong>sospechoso</strong>. (Puntaje: ${score})`);
        } else {
            setResult("#e6fff0", "6px solid #28a745", `✅ Contenido limpio. (Puntaje: ${score})`);
        }
    }

    /**
     * Obtiene y unifica todo el texto ingresado desde textarea, archivo o imagen.
     * @returns {Promise<string>} Texto total unificado en minúsculas.
     */
    async function getAllText() {
        let text = textAreaText;

        if (file) {
            if (file.type === "text/plain") {
                text += " " + await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result.toLowerCase());
                    reader.readAsText(file);
                });
            } else if (file.type === "application/pdf") {
                text += " " + await extractTextFromPDF(file);
            }
        }

        if (image) {
            try {
                const imageText = await extractTextFromImage(image);
                text += " " + imageText;
            } catch {
                // Si falla el OCR, continuar sin texto de imagen
            }
        }

        return text;
    }

    // Ejecutar análisis final
    try {
        computeScore(await getAllText(), file, image);
    } catch (e) {
        setResult("#ffe6e6", "6px solid #cc0000", "❌ Error al analizar la imagen o archivo.");
    }
}
