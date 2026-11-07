import { type ComponentPropsWithoutRef, useEffect, useState, useRef } from "react";
import { api } from "../lib/api.ts";

interface ServerImgProps extends ComponentPropsWithoutRef<"img"> {
    fileId: string;
    alt?: string;
    onLoadFileName?: (fileName: string) => void; // 파일명 전달용 콜백 추가
    onLoadError?: () => void;
}

export default function ServerImg({
    fileId,
    alt,
    onLoadFileName,
    onLoadError,
    ...props
}: ServerImgProps) {
    const [src, setSrc] = useState<string>();
    const fileNameCallback = useRef<(fileName: string) => void>(onLoadFileName);
    const errorCallback = useRef(onLoadError);
    useEffect(() => {
        fileNameCallback.current = onLoadFileName;
        errorCallback.current = onLoadError;
    }, [onLoadFileName, onLoadError]);

    useEffect(() => {
        let urlLocal = "";
        const controller = new AbortController();

        const fetchImage = async () => {
            try {
                const response = await api.get(`files/${fileId}`, {
                    responseType: "blob",
                    signal: controller.signal
                });
                if (controller.signal.aborted) return;

                // Content-Disposition 헤더에서 filename 추출
                const contentDisposition =
                    response.headers["content-disposition"] ||
                    response.headers["Content-Disposition"];

                if (contentDisposition && fileNameCallback.current) {
                    // filename="xxx" 혹은 filename*=UTF-8''xxx 형태 정규식 추출
                    const match =
                        /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition) ||
                        /filename="([^"]+)"/i.exec(contentDisposition) ||
                        /filename=([^;]+)/i.exec(contentDisposition);

                    if (match && match[1]) {
                        const extractedFileName = decodeURIComponent(match[1].trim());
                        fileNameCallback.current(extractedFileName);
                    }
                }

                const url = URL.createObjectURL(response.data);
                urlLocal = url;
                setSrc(url);
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error(`이미지 로드 실패 [fileId: ${fileId}]:`, err);
                errorCallback.current?.();
            }
        };

        void fetchImage();

        return () => {
            controller.abort();
            if (urlLocal) URL.revokeObjectURL(urlLocal);
        };
    }, [fileId]);

    return <img src={src} alt={alt!} {...props} />;
}
