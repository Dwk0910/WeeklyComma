import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

const fields = [
    { key: "authorName", label: "사용자 이름", placeholder: "문의 작성 당시 이름" },
    { key: "title", label: "제목", placeholder: "제목에 포함된 말" },
    { key: "content", label: "내용", placeholder: "문의 본문에 포함된 말" }
];
const input = "mt-2 w-full rounded-xs border border-neutral-300 bg-white px-3 py-2 text-sm";

export default function InquiryFilters() {
    const [params, setParams] = useSearchParams();
    const [error, setError] = useState("");
    function search(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        for (const key of ["authorName", "title", "content", "from", "to"]) {
            const value = String(values.get(key) || "").trim();
            if (value) next.set(key, value);
        }
        if (next.get("from") && next.get("to") && next.get("from")! > next.get("to")!) {
            setError("시작일은 종료일보다 늦을 수 없습니다.");
            return;
        }
        setError("");
        setParams(next);
    }
    return (
        <form
            onSubmit={search}
            aria-label="문의 검색 및 필터"
            className="mb-7 space-y-4 border border-neutral-200 bg-neutral-50 p-5"
        >
            <div className="grid grid-cols-3 gap-4">
                {fields.map(({ key, label, placeholder }) => (
                    <label key={key} className="text-sm">
                        {label}
                        <input
                            name={key}
                            defaultValue={params.get(key) || ""}
                            maxLength={200}
                            placeholder={placeholder}
                            className={input}
                        />
                    </label>
                ))}
            </div>
            <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm">
                    작성 시작일
                    <input
                        type="date"
                        name="from"
                        min="0001-01-01"
                        max="9999-12-31"
                        defaultValue={params.get("from") || ""}
                        className={input}
                    />
                </label>
                <label className="text-sm">
                    작성 종료일
                    <input
                        type="date"
                        name="to"
                        min="0001-01-01"
                        max="9999-12-31"
                        defaultValue={params.get("to") || ""}
                        className={input}
                    />
                </label>
                <div className="ml-auto flex gap-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.currentTarget.form?.reset();
                            setError("");
                            setParams({});
                        }}
                        className="cursor-pointer rounded-xs border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100"
                    >
                        초기화
                    </button>
                    <button className="cursor-pointer rounded-xs border border-neutral-800 bg-neutral-800 px-5 py-2 text-sm text-white hover:bg-neutral-700">
                        검색
                    </button>
                </div>
            </div>
            <p className="text-xs leading-6 text-neutral-500">
                입력한 조건을 모두 만족하는 문의를 찾습니다. 날짜는 한국 시간 기준이며, 시작일과
                종료일을 모두 포함합니다.
            </p>
            {error && (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            )}
        </form>
    );
}
