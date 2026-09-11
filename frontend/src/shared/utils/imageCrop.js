// Preserves the FULL image aspect ratio (NO cropping/cutting of heads, body, or sides)
// Proportional scaling is applied only if the image exceeds maxDimension.
export const cropImageToSquare = (file, maxDimension = 1920) => new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
        return resolve(file);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
        let { width, height } = img;

        // If within maximum dimension bounds, keep original image intact
        if (width <= maxDimension && height <= maxDimension) {
            URL.revokeObjectURL(url);
            return resolve(file);
        }

        // Scale proportionally preserving 100% of the image contents (NO cropping)
        if (width > height) {
            if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
                return resolve(file);
            }
            const outName = file.name.replace(/\.\w+$/, '') + '.jpg';
            resolve(new File([blob], outName, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
    };

    img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
    };

    img.src = url;
});

export const optimizeImageForUpload = cropImageToSquare;
