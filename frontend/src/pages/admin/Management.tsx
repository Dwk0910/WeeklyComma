import { Fragment, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { MdKeyboardArrowUp } from "react-icons/md";
import { getLSdata } from "../../index.tsx";
import Title from "../../component/Title.tsx";

type MenuLink = { name: string; path: string };
type Menu = MenuLink | { name: string; submenus: MenuLink[] };
const menu: Menu[] = [
    { name: "메인 페이지 관리", path: "/management" },
    { name: "문의 관리", path: "/management/inquiries" },
    {
        name: "게시판 글 관리",
        submenus: [
            { name: "공지 게시판", path: "/management/notices" },
            { name: "이벤트 게시판", path: "/management/events" }
        ]
    },
    {
        name: "책 관리",
        submenus: [{ name: "추천 책 관리", path: "/management/recommendations" }]
    }
];
const menuStyle =
    "w-full border-b border-gray-300 px-4 py-2.5 text-left font-suite text-lg transition-colors hover:bg-gray-100 cursor-pointer";

export default function Management() {
    const { pathname } = useLocation();
    const [subMenuOpen, setSubMenuOpen] = useState<Record<string, boolean>>({});
    const session = getLSdata();
    if (!session || session["userType"] !== "CURATOR") return <Navigate to="/" replace />;

    const renderLink = (item: MenuLink, nested = false) => (
        <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/management"}
            className={({ isActive }) => clsx(menuStyle, isActive && "bg-gray-200")}
        >
            <span className={nested ? "ml-4" : undefined}>{item.name}</span>
        </NavLink>
    );

    return (
        <>
            <Title subtitle="주간쉼표 서비스를 관리합니다.">주간쉼표 대시보드</Title>
            <div className="flex">
                <nav
                    aria-label="관리 메뉴"
                    className="flex w-64 shrink-0 flex-col border-x border-gray-300 select-none"
                >
                    {menu.map((item) => {
                        if ("path" in item) return renderLink(item);
                        const open =
                            subMenuOpen[item.name] ??
                            item.submenus.some((child) => pathname === child.path);
                        return (
                            <Fragment key={item.name}>
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    className={clsx(menuStyle, "flex items-center justify-between")}
                                    onClick={() =>
                                        setSubMenuOpen((prev) => ({ ...prev, [item.name]: !open }))
                                    }
                                >
                                    {item.name}
                                    <MdKeyboardArrowUp
                                        aria-hidden="true"
                                        className={clsx(
                                            "transition-transform",
                                            !open && "rotate-180"
                                        )}
                                    />
                                </button>
                                {open && item.submenus.map((child) => renderLink(child, true))}
                            </Fragment>
                        );
                    })}
                </nav>
                <div
                    key={pathname}
                    className="h-170 min-w-0 flex-1 overflow-y-auto"
                    aria-label="관리 내용"
                >
                    <Outlet />
                </div>
            </div>
        </>
    );
}
