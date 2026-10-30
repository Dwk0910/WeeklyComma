import { useEffect } from "react";

export default function PageTitle({ title }: { title: string }) {
    useEffect(() => {
        const previous = document.title;
        document.title = `${title} | 주간쉼표`;
        return () => {
            document.title = previous;
        };
    }, [title]);
    return null;
}
