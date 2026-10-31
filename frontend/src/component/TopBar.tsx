import title from "../assets/title.png";

import { clsx } from "clsx";

// import { TbTriangleFilled } from "react-icons/tb";
import { IoCloseCircleOutline } from "react-icons/io5";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { LuBookmark, LuMegaphone } from "react-icons/lu";

import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const menuLinkClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? "underline underline-offset-8" : "";

const headerIconClassName =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500";
const headerIconProps = { size: 32, strokeWidth: 1.5, "aria-hidden": true } as const;

export default function TopBar({ admin }: { admin: boolean }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isMenuOpened, setMenuOpen] = useState(false);

    return (
        <>
            <div className={"w-full flex items-center mt-10"}>
                <img
                    src={title}
                    alt={"logo"}
                    className={"w-75 cursor-pointer"}
                    onClick={() => window.location.assign("/")}
                />
                <div
                    className={
                        "flex items-center w-280 rounded-full border border-gray-300 h-13 pl-7"
                    }
                >
                    <span className={"font-suite text-neutral-600 mx-3"}>통합검색</span>
                    {/*<TbTriangleFilled className={"ml-5 text-[.7rem] text-neutral-400 mt-[0.3vh]"} />*/}
                    <div className={"border-l border-l-neutral-300 h-5 mx-5"}></div>
                    <input
                        id={"WEEKLYCOMMA_SEARCH"}
                        type={"text"}
                        placeholder={"검색어를 입력해 주세요"}
                        className={"w-120 outline-none"}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div
                        className={clsx(
                            "mx-2 text-2xl text-gray-500 transition-all duration-200",
                            searchQuery.length === 0 ? "opacity-0" : "opacity-100 cursor-pointer"
                        )}
                        onClick={() => setSearchQuery("")}
                    >
                        <IoCloseCircleOutline />
                    </div>
                    <div className={"w-5 text-2xl cursor-pointer"}>
                        <HiMagnifyingGlass />
                    </div>
                </div>
                <div className="ml-8 flex shrink-0 items-center gap-2">
                    <Link to="/notices" aria-label="공지 목록 보기" className={headerIconClassName}>
                        <LuMegaphone {...headerIconProps} />
                    </Link>
                    <Link
                        to="/favorites"
                        aria-label="내 책갈피 보기"
                        className={headerIconClassName}
                    >
                        <LuBookmark {...headerIconProps} />
                    </Link>
                    <button
                        type="button"
                        aria-label={isMenuOpened ? "메뉴 닫기" : "메뉴 열기"}
                        className={`${headerIconClassName} group/menu-icon cursor-pointer`}
                        onClick={() => setMenuOpen((prev) => !prev)}
                    >
                        <span aria-hidden="true" className="relative block size-8">
                            <span
                                className={clsx(
                                    "absolute top-[7px] h-0.5 rounded-full bg-current transition-all duration-200 ease-in-out",
                                    isMenuOpened
                                        ? "right-0.5 w-7 translate-y-2 rotate-45"
                                        : "right-1 w-6"
                                )}
                            />
                            <span
                                className={clsx(
                                    "absolute top-[15px] right-1 h-0.5 w-6 rounded-full bg-current transition-all duration-200 ease-in-out group-hover/menu-icon:w-4",
                                    isMenuOpened && "opacity-0"
                                )}
                            />
                            <span
                                className={clsx(
                                    "absolute top-[23px] h-0.5 rounded-full bg-current transition-all duration-200 ease-in-out",
                                    isMenuOpened
                                        ? "right-0.5 w-7 -translate-y-2 -rotate-45"
                                        : "right-1 w-6"
                                )}
                            />
                        </span>
                    </button>
                </div>
            </div>
            <style>
                {`
                .menucontainer > span, .menucontainer > a {
                    margin-left: 2.5rem;
                    transition: color .06s ease-in-out;
                    cursor: pointer;
                }
                
                .menucontainer > span:hover, .menucontainer > a:hover {
                    color: #4b5563;
                }
               `}
            </style>
            <nav
                aria-label="주 메뉴"
                className={"w-full flex mx-15 font-suite text-xl menucontainer"}
            >
                <NavLink to="/about" className={menuLinkClassName}>
                    소개
                </NavLink>
                <NavLink to="/notices" className={menuLinkClassName}>
                    공지
                </NavLink>
                <NavLink to="/events" className={menuLinkClassName}>
                    이벤트
                </NavLink>
                <NavLink to="/weekly-recommendations" className={menuLinkClassName}>
                    정기추천
                </NavLink>
                <NavLink to="/recommendations" className={menuLinkClassName}>
                    일반추천
                </NavLink>
                <NavLink to="/favorites" className={menuLinkClassName}>
                    내 책갈피
                </NavLink>
                <NavLink to="/to-curator" className={menuLinkClassName}>
                    To. 쉼표지기
                </NavLink>
                {admin && (
                    <NavLink to="/management" className={menuLinkClassName}>
                        관리
                    </NavLink>
                )}
            </nav>
        </>
    );
}
