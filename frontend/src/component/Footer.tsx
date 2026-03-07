import logo from "../assets/title.png";

export default function Footer() {
    return (
        <div className={"w-full m-5 pb-10"}>
            <img src={logo} alt={"logo"} className={"w-60"} />
            <div className={"flex flex-col ml-4 font-suite -mt-2"}>
                <span className={"text-2xl font-bold"}>주간쉼표</span>
                <span className={"text-xl text-gray-500"}>WeeklyComma</span>
            </div>
            <div className={"flex flex-col ml-4 font-suite mt-2"}>
                <span>
                    This project is also available on the{" "}
                    <span
                        className={"hover:underline cursor-pointer"}
                        onClick={() =>
                            window.location.assign("https://github.com/Dwk0910/WeeklyComma")
                        }
                    >
                        Github Repository
                    </span>
                </span>
                <span>
                    본 저작물은 아파치 라이선스 2.0 (Apache License 2.0)에 따라 이용하실 수
                    있습니다.
                </span>
                <span className={"mt-5 text-gray-500"}>
                    Copyright 2026. Dwk0910 All rights reserved.
                </span>
            </div>
        </div>
    );
}
