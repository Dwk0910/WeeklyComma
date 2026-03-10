import { useEffect, useState, type ReactNode } from "react";
import { BACKEND_ADDRESS } from "../../App.tsx";

import { clsx } from "clsx";
import axios from "axios";

import Title from "../../component/Title.tsx";

// Managment component imports
import ManageMainPage from "./ManageMainPage.tsx";

export default function Management() {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);

    // <div>메인 페이지 관리</div>
    // <div>공지글 작성</div>
    // <div>이벤트글 작성</div>
    // <div>정기추천글 작성</div>
    // <div>일반추천글 작성</div>
    // <div>쉼표지기 문의사항 관리 및 답변</div>
    // <div>기타 관리</div>

    // Management menu definitions
    const menu: {
        name: string;
        component: (key: string) => ReactNode;
    }[] = [
        {
            name: "메인 페이지 관리",
            component: (key) => <ManageMainPage key={key} />
        },
        {
            name: "공지글 작성",
            component: (key) => {
                return (
                    <div key={key}>
                        <span>공지글 작성 컴포넌트</span>
                    </div>
                );
            }
        }
    ];

    // Menu state
    const [currentMenu, setCurrentMenu] = useState<string>(menu[0].name);

    // Authentication check
    useEffect(() => {
        const token = localStorage.getItem("wca_token");
        axios
            .get(BACKEND_ADDRESS + "health", { headers: { "X-Client-Session-ID": token } })
            .then((e) => {
                if (e.data == "OK_LOGIN") setAuthenticated(true);
                else setAuthenticated(false);
            })
            .catch((_) => setAuthenticated(false));
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
                        "flex-2/7 flex flex-col border-r border-gray-300 dashboard_btn_container"
                    }
                >
                    {menu.map((item) => (
                        <div
                            key={`dashboard_btn_container_${item.name}`}
                            className={clsx(currentMenu == item.name && "bg-gray-200")}
                            onClick={() => setCurrentMenu(item.name)}
                        >
                            {item.name}
                        </div>
                    ))}
                </div>
                <div className={"flex-6/7 h-170 overflow-y-scroll"}>
                    {menu.map(
                        (item) =>
                            item.name == currentMenu &&
                            item.component(`dashboard_component_${item.name}`)
                    )}
                </div>
            </div>
        </>
    );
}
