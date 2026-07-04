import { type ComponentPropsWithoutRef, useEffect, useState } from "react";
import { BACKEND_ADDRESS } from "../App.tsx";
import axios from "axios";

interface ServerImgProps extends ComponentPropsWithoutRef<"img"> {
    fileId: string;
    alt?: string;
}

export default function ServerImg({ fileId, alt, ...props }: ServerImgProps) {
    const [src, setSrc] = useState<string>();

    useEffect(() => {
        let urlLocal = "";

        const fetchImage = async () => {
            const response = await axios.get(BACKEND_ADDRESS + `files/${fileId}`, {
                responseType: "blob"
            });

            const url = URL.createObjectURL(response.data);
            urlLocal = url;
            setSrc(url);
        };
        void fetchImage();

        return () => {
            if (urlLocal) URL.revokeObjectURL(urlLocal);
        };
    }, [fileId]);

    return <img src={src} alt={alt!} {...props} />;
}
