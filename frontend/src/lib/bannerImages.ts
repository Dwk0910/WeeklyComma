export const bannerSizes = {
    left: { width: 1680, height: 800 },
    top: { width: 630, height: 750 },
    bottom: { width: 840, height: 400 }
} as const;
export type BannerPlacement = keyof typeof bannerSizes;

export function bannerDimensions(width: number, height: number, placement: BannerPlacement) {
    const max = bannerSizes[placement];
    const scale = Math.min(1, max.width / width, max.height / height);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale))
    };
}

export async function optimizeBanner(file: File, placement: BannerPlacement): Promise<File> {
    const image = await createImageBitmap(file);
    try {
        const size = bannerDimensions(image.width, image.height, placement);
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("배너 이미지를 처리하지 못했습니다.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, size.width, size.height);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (value) => {
                    if (value?.type === "image/webp") resolve(value);
                    else
                        reject(
                            new Error(
                                "WebP 이미지를 만들지 못했습니다. 브라우저를 업데이트해 주세요."
                            )
                        );
                },
                "image/webp",
                0.92
            );
        });
        if (image.width === size.width && image.height === size.height && blob.size >= file.size)
            return file;
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: blob.type });
    } finally {
        image.close();
    }
}
