import { type ComponentPropsWithoutRef, useEffect, useState, useRef } from "react";
import { BACKEND_ADDRESS, api } from "../index.tsx";

interface ServerImgProps extends ComponentPropsWithoutRef<"img"> {
    fileId: string;
    alt?: string;
    onLoadFileName?: (fileName: string) => void; // 파일명 전달용 콜백 추가
}

export default function ServerImg({ fileId, alt, onLoadFileName, ...props }: ServerImgProps) {
    const [src, setSrc] = useState<string>();
    const fileNameCallback = useRef<(fileName: string) => void>(onLoadFileName);

    useEffect(() => {
        let urlLocal = "";

        const fetchImage = async () => {
            try {
                const response = await api.get(BACKEND_ADDRESS + `files/${fileId}`, {
                    responseType: "blob"
                });

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
                console.error(`이미지 로드 실패 [fileId: ${fileId}]:`, err);
            }
        };

        void fetchImage();

        return () => {
            if (urlLocal) URL.revokeObjectURL(urlLocal);
        };
    }, [fileId]);

    return <img src={src} alt={alt!} {...props} />;
}
