import * as React from "react";
import { useEffect, useState, type ReactNode } from "react";
import { BACKEND_ADDRESS } from "../../App.tsx";

import { clsx } from "clsx";
import axios from "axios";

import { MdKeyboardArrowUp } from "react-icons/md";

import Title from "../../component/Title.tsx";

// Managment component imports
import ManageMainPage from "./ManageMainPage.tsx";
import ManageNotifications from "./ManageBoards/ManageNotifications.tsx";
import ManageEventBoards from "./ManageBoards/ManageEventBoards.tsx";
import ManageRecommendation from "./ManageRecommendation.tsx";

// Management menu definitions
type Menu = {
    name: string;
    component?: (key: string) => ReactNode;
    submenus?: { name: string; component: (key: string) => ReactNode }[];
};

const menu: Menu[] = [
    {
        name: "메인 페이지 관리",
        component: (key) => <ManageMainPage key={key} />
    },
    {
        name: "게시판 글 관리",
        submenus: [
            {
                name: "공지 게시판",
                component: (key) => {
                    return <ManageNotifications key={key} />;
                }
            },
            {
                name: "이벤트 게시판",
                component: (key) => {
                    return <ManageEventBoards key={key} />;
                }
            }
        ]
    },
    {
        name: "책 관리",
        submenus: [
            {
                name: "추천 책 관리",
                component: (key) => <ManageRecommendation key={key} />
            }
        ]
    }
];

export default function Management() {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);

    // <div>메인 페이지 관리</div>
    // <div>공지글 작성</div>
    // <div>이벤트글 작성</div>
    // <div>정기추천글 작성</div>
    // <div>일반추천글 작성</div>
    // <div>쉼표지기 문의사항 관리 및 답변</div>
    // <div>기타 관리</div>

    // Menu state
    const [currentMenu, setCurrentMenu] = useState<string>();
    const [subMenuOpen, setSubMenuOpen] = useState<{ [collapsibleMenuName: string]: boolean }>({});

    // Authentication check & initial registering collapsible menu items to state values
    useEffect(() => {
        const token = localStorage.getItem("wca_token");
        axios
            .get(BACKEND_ADDRESS + "health", { headers: { "X-Client-Session-ID": token } })
            .then((e) => {
                if (e.data == "OK_LOGIN") setAuthenticated(true);
                else setAuthenticated(false);
            })
            .catch((_) => setAuthenticated(false));

        (() => {
            setCurrentMenu(menu[0].name);
            for (const item of menu) {
                if (item.submenus)
                    setSubMenuOpen((prev) => ({
                        ...prev,
                        [item.name]: false
                    }));
            }
        })();
    }, []);

    if (authenticated == null) {
        return <div>관리자 인증 중입니다. 잠시만 기다려 주십시오...</div>;
    } else if (!authenticated) {
        localStorage.removeItem("wca_token");
        window.location.replace(".");
    }

    return (
        <>
            <Title subtitle={"주간쉼표 서비스를 관리합니다."}>주간쉼표 대시보드</Title>
            <div className={"flex"}>
                <style>
                    {`
                        .dashboard_btn_container > div {
                            padding: 0.6rem 1rem;
                            font-family: 'suite', monospace;
                            font-size: 1.1rem;
                            border-bottom: 1px solid #d1d5db;
                            transition: background-color 0.16s ease-in-out;
                            cursor: pointer;
                        }
                      
                        .dashboard_btn_container > div:hover {
                            background-color: #f3f4f6;
                        }
                        `}
                </style>
                <div
                    className={
                        "flex-2/7 flex flex-col border-r border-l border-gray-300 dashboard_btn_container select-none"
                    }
                >
                    {menu.map((item) => {
                        if (!item.submenus) {
                            return (
                                <div
                                    key={`dashboard_btn_container_${item.name}`}
                                    className={clsx(currentMenu == item.name && "bg-gray-200")}
                                    onClick={() => setCurrentMenu(item.name)}
                                >
                                    {item.name}
                                </div>
                            );
                        } else
                            return (
                                <React.Fragment
                                    key={`dashboard_btn_container_collapsible_${item.name}`}
                                >
                                    <div
                                        className={"flex items-center justify-between"}
                                        onClick={() => {
                                            setSubMenuOpen((prev) => ({
                                                ...prev,
                                                [item.name]: !prev[item.name]
                                            }));
                                        }}
                                    >
                                        {item.name}
                                        <span
                                            className={clsx(
                                                "transition-transform duration-200 ease-in-out",
                                                subMenuOpen[item.name] ? "rotate-0" : "rotate-180"
                                            )}
                                        >
                                            <MdKeyboardArrowUp />
                                        </span>
                                    </div>
                                    {subMenuOpen[item.name] &&
                                        item.submenus.map((submenu) => (
                                            <div
                                                key={`dashboard_submenu_btn_container_${submenu.name}`}
                                                className={clsx(
                                                    currentMenu == submenu.name && "bg-gray-200"
                                                )}
                                                onClick={() => {
                                                    setCurrentMenu(submenu.name);
                                                }}
                                            >
                                                <span className={"ml-4"}>{submenu.name}</span>
                                            </div>
                                        ))}
                                </React.Fragment>
                            );
                    })}
                </div>
                <div className={"flex-6/7 h-170 overflow-y-scroll"}>
                    {menu.map((item) => {
                        const key = `dashboard_component_${item.name}`;
                        if (item.name == currentMenu && item.component) return item.component(key);
                        else if (item.submenus) {
                            const submenu = item.submenus.find((q) => q.name == currentMenu);
                            return submenu && submenu.component(key);
                        }
                    })}
                </div>
            </div>
        </>
    );
}
