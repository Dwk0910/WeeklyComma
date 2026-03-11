import { useState } from "react";
import Component, { Title, SubTitle } from "./lib_component/Component";

export default function ManageBoards() {
    const [selectedBoard, setSelectedBoard] = useState<
        "Notifications" | "Events" | "GeneralRecommands"
    >("Notifications");

    return (
        <Component>
            <Title>게시판 글 관리</Title>
            <SubTitle>글 목록</SubTitle>
        </Component>
    );
}
