export default function SubmitButton({
    className,
    onClick_revert,
    onClick_apply
}: {
    className?: string;
    onClick_revert: () => void;
    onClick_apply: () => void;
}) {
    return (
        <div className={className}>
            <div className={"flex"}>
                <div
                    className={
                        "bg-red-700/80 w-20 h-10 text-white font-suite px-2 flex items-center justify-center rounded-sm"
                    }
                    onClick={onClick_revert}
                >
                    원래대로
                </div>
                <div
                    className={
                        "bg-green-700/80 w-30 h-10 text-white font-suite px-2 ml-4 flex items-center justify-center rounded-sm"
                    }
                    onClick={onClick_apply}
                >
                    변경사항 적용
                </div>
            </div>
        </div>
    );
}
