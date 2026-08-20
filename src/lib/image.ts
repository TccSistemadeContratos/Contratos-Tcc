// Redimensiona uma imagem no navegador e devolve um data URL (base64),
// pequeno o suficiente para caber num documento do Firestore (limite ~1 MB).
// Guardamos a logo como string direto no doc — sem Firebase Storage.
export async function resizeImageToDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Não foi possível processar a imagem.'));
        ctx.drawImage(img, 0, 0, width, height);
        // PNG preserva transparência; cai para JPEG se ficar grande demais.
        let out = canvas.toDataURL('image/png');
        if (out.length > 680_000) out = canvas.toDataURL('image/jpeg', 0.85);
        resolve(out);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
