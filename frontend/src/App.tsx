import PreTopBar from "./component/PreTopBar";
import TopBar from "./component/TopBar";

export default function App() {
    return (
        <div className={"w-full flex justify-center"}>
            <div className={"w-full absolute bg-gray-200 h-10 z-0"} />
            <div className={"w-300 z-10"}>
                <PreTopBar />
                <TopBar />
            </div>
        </div>
    );
}
