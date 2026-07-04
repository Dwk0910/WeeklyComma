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
        const fetchImage = async () => {
            const response = await axios.get(BACKEND_ADDRESS + `files/base64/${fileId}`);
            setSrc(response.data);
        };
        void fetchImage();
    }, [fileId]);

    return <img src={src} alt={alt!} {...props} />;
}
