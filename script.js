async function analyzeSpam() {
    const textAreaText = document.getElementById('textInput').value.toLowerCase();
    const file = document.getElementById('fileInput').files[0];
    const image = document.getElementById('imageInput').files[0];
    const resultsDiv = document.getElementById('results');

    function setResult(bg, border, msg) {
        resultsDiv.style.background = bg;
        resultsDiv.style.borderLeft = border;
        resultsDiv.innerHTML = msg;
    }

    resultsDiv.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
        <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f50e.svg" alt="" style="width:1.2em;vertical-align:middle;">
        Analizando${image ? " imagen (esto puede tardar unos segundos)..." : "..."}</span>`;
    resultsDiv.style.background = "#f0f0f0";
    resultsDiv.style.borderLeft = "none";

    let totalText = textAreaText;

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
        { pattern: /\b[A-Z]{4,}\b/, weight: 1 },
    ];

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

    async function extractTextFromImage(image) {
        // Añade feedback visual de progreso y timeout de 30s
        return Promise.race([
            Tesseract.recognize(image, 'eng', { logger: m => {} })
                .then(result => result.data.text.toLowerCase())
                .catch(() => ""),
            new Promise(resolve => setTimeout(() => resolve(""), 30000))
        ]);
    }

    function computeScore(text, file, image) {
        let score = 0;
        spamPatterns.forEach(rule => {
            if (rule.pattern.test(text)) score += rule.weight;
        });

        if (file && !['application/pdf', 'text/plain'].includes(file.type)) score += 2;
        if (image) {
            if (image.size > 5 * 1024 * 1024) score += 2;
            if (/gratis|promo|win/.test(image.name.toLowerCase())) score += 2;
        }

        if (score >= 5) {
            setResult("#ffe6e6", "6px solid #cc0000", `🚫 Este contenido fue clasificado como <strong>SPAM</strong>. (Puntaje: ${score})`);
        } else if (score >= 3) {
            setResult("#fff9e6", "6px solid #e6b800", `⚠️ Contenido <strong>sospechoso</strong>. (Puntaje: ${score})`);
        } else {
            setResult("#e6fff0", "6px solid #28a745", `✅ Contenido limpio. (Puntaje: ${score})`);
        }
    }

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
                // Si falla el OCR, continúa con el texto existente
            }
        }
        return text;
    }

    try {
        computeScore(await getAllText(), file, image);
    } catch (e) {
        setResult("#ffe6e6", "6px solid #cc0000", "❌ Error al analizar la imagen o archivo.");
    }
}
