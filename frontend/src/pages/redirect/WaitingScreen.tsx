export default function WaitingScreen() {
    return (
        <div className={"w-full h-full flex justify-center items-center my-15"}>
            <div
                className={
                    "flex flex-col font-suite items-center border border-gray-400 px-20 py-10"
                }
            >
                <span className={"font-bold text-3xl"}>인증 중입니다</span>
                <span>잠시만 기다려 주세요</span>
            </div>
        </div>
    );
}