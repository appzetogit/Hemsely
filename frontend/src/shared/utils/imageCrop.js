// Center-crops an image to a square and resizes it, so gallery/profile photos
// with mismatched aspect ratios always display consistently (object-fit: cover
// containers no longer clip faces/subjects unpredictably).
export const cropImageToSquare = (file, targetSize = 1080) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

        canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
                reject(new Error('Failed to process image'));
                return;
            }
            const croppedName = file.name.replace(/\.\w+$/, '') + '.jpg';
            resolve(new File([blob], croppedName, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
    };

    img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
    };

    img.src = url;
});
