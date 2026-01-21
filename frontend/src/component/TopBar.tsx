import title from "../assets/title.png";
import megaphone from "../assets/megaphone.png";

import { clsx } from "clsx";

// import { TbTriangleFilled } from "react-icons/tb";
import { IoCloseCircleOutline } from "react-icons/io5";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { CiStar } from "react-icons/ci";

import { useState } from "react";

export default function TopBar() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isMenuOpened, setMenuOpen] = useState(false);

    return (
        <div className={"w-full flex items-center mt-10"}>
            <img
                src={title}
                alt={"logo"}
                className={"w-75 cursor-pointer"}
                onClick={() => window.location.assign(".")}
            />
            <div
                className={"flex items-center w-280 rounded-full border border-gray-300 h-13 pl-7"}
            >
                <span className={"font-suite text-neutral-600 mx-3"}>통합검색</span>
                {/*<TbTriangleFilled className={"ml-5 text-[.7rem] text-neutral-400 mt-[0.3vh]"} />*/}
                <div className={"border-l border-l-neutral-300 h-5 mx-5"}></div>
                <input
                    type={"text"}
                    placeholder={"검색어를 입력해 주세요"}
                    className={"w-120 outline-none"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div
                    className={clsx(
                        "mx-2 text-2xl text-gray-500 transition-all duration-200",
                        searchQuery.length === 0 ? "opacity-0" : "opacity-100"
                    )}
                >
                    <IoCloseCircleOutline />
                </div>
                <div className={"w-5 text-2xl cursor-pointer"}>
                    <HiMagnifyingGlass />
                </div>
            </div>
            <div className={"flex items-center w-70 pl-10"}>
                <span className={"text-5xl cursor-pointer"}>
                    <img src={megaphone} alt={"공지"} className={"w-8"} />
                </span>
                <span className={"text-4xl ml-3 cursor-pointer w-8"}>
                    <CiStar />
                </span>
                <div
                    className={
                        "flex flex-col items-end text-3xl ml-4 w-7.5 cursor-pointer group/menu-icon"
                    }
                    onClick={() => {
                        setMenuOpen((prev) => !prev);
                    }}
                >
                    <div
                        className={clsx(
                            "w-6.25 h-0.75 border border-neutral-700 bg-neutral-700 rounded-full",
                            "transition-all duration-200",
                            isMenuOpened && "rotate-45 translate-y-2.5 w-7.5"
                        )}
                    />
                    <div
                        className={clsx(
                            "w-6.25 h-0.75 border border-neutral-700 bg-neutral-700 rounded-full",
                            "mt-1.75",
                            "group-hover/menu-icon:w-4 transition:all duration-200 ease-in-out",
                            isMenuOpened && "opacity-0"
                        )}
                    />
                    <div
                        className={clsx(
                            "w-6.25 h-0.75 border border-neutral-700 bg-neutral-700 rounded-full",
                            "mt-1.75 transition-all duration-200",
                            isMenuOpened && "-rotate-45 -translate-y-2.5 w-7.5"
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
