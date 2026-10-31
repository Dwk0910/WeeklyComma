import { useEffect, useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
    Link,
    Navigate,
    useLocation,
    useNavigate,
    useParams,
    useSearchParams
} from "react-router-dom";
import { LuBookOpen, LuBug, LuLightbulb, LuMessageCircle } from "react-icons/lu";
import { api } from "../index.tsx";
import PageTitle from "../component/PageTitle.tsx";
import { LoginRedirect } from "../component/RequireLogin.tsx";
import InquiryAttachments from "./InquiryAttachments.tsx";
import {
    FILE_ACCEPT,
    FILE_EXTENSIONS,
    fileSize,
    useInquiryUploads,
    type InquiryAttachment
} from "./inquiryFiles.ts";
import { BoardFeedback, PostDate } from "./boards/BoardShared.tsx";

const kinds = {
    BOOK: {
        label: "책·추천 이야기",
        short: "좋았던 책과, 책을 소개하는 일에 관한 제안을 들려주세요.",
        help: "더 많은 사람에게 알리고 싶은 책, 소개글에서 짚어주고 싶은 부분, 책을 소개하는 일에 함께하고 싶은 마음을 전해주세요.",
        placeholder:
            "전하고 싶은 내용만 편하게 적어주세요.\n책 제목이나 관련 글과 함께, 제안하는 이유를 알려주시면 도움이 됩니다.",
        icon: LuBookOpen
    },
    BUG: {
        label: "오류 신고",
        short: "작동하지 않는 기능이 있어요.",
        help: "어느 화면에서, 어떤 동작을 했을 때 문제가 생겼는지 알려주세요.",
        placeholder: "이용한 화면:\n시도한 동작:\n발생한 문제:",
        icon: LuBug
    },
    SUGGESTION: {
        label: "서비스 개선 제안",
        short: "화면이나 기능에 바라는 점이 있어요.",
        help: "주간쉼표의 화면이나 기능에서 불편했던 점과 원하는 모습을 알려주세요.",
        placeholder: "불편했던 점이나 제안하고 싶은 기능을 자유롭게 적어주세요.",
        icon: LuLightbulb
    },
    OTHER: {
        label: "기타 문의",
        short: "그 밖에 궁금한 것이 있어요.",
        help: "서비스를 이용하며 궁금했던 내용을 편하게 남겨주세요.",
        placeholder: "쉼표지기에게 전하고 싶은 이야기를 적어주세요.",
        icon: LuMessageCircle
    }
};
type Kind = keyof typeof kinds;
type Summary = {
    id: number;
    category: Kind;
    title: string;
    authorName: string;
    createdAt: number;
    answered: boolean;
};
type Detail = {
    inquiry: Summary;
    content: string;
    answer: string | null;
    answeredAt: number | null;
    attachments?: InquiryAttachment[];
};
type Listing = { items: Summary[]; total: number; pages: number };
const button =
    "inline-flex items-center justify-center rounded-xs border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-50 cursor-pointer disabled:opacity-50 disabled:cursor-wait";
const primary = `${button} bg-neutral-800 text-white border-neutral-800 hover:bg-neutral-700`;
const field = "w-full rounded-xs border border-neutral-300 px-4 py-3 text-base outline-offset-4";
const errorStatus = (error: unknown) => (isAxiosError(error) ? error.response?.status : undefined);

export default function Inquiries({ admin = false }: { admin?: boolean }) {
    const route = useParams()["*"] || "";
    const [params] = useSearchParams();
    const rawPage = Number(params.get("page") || 1);
    const page =
        Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 2147483647 ? rawPage : 1;
    const base = admin ? "/management/inquiries" : "/to-curator";
    const endpoint = admin ? "inquiries/admin" : "inquiries";
    const isNew = route === "new" && !admin;
    const isDetail =
        /^\d+$/.test(route) && Number.isSafeInteger(Number(route)) && Number(route) > 0;
    const invalid = !!route && !isNew && !isDetail;
    const url = isDetail ? `${endpoint}/${route}` : `${endpoint}?page=${isNew ? 0 : page - 1}`;
    const [result, setResult] = useState<{ url: string; data?: Listing | Detail; status?: number }>(
        { url: "" }
    );
    const [attempt, setAttempt] = useState(0);
    const location = useLocation();
    const [sessionExpired, setSessionExpired] = useState(false);
    const login = () => setSessionExpired(true);

    useEffect(() => {
        if (invalid) return;
        const controller = new AbortController();
        api.get<Listing | Detail>(url, { signal: controller.signal })
            .then(({ data }) => {
                if (!controller.signal.aborted) setResult({ url, data });
            })
            .catch((error) => {
                if (!controller.signal.aborted)
                    setResult({ url, status: errorStatus(error) || 500 });
            });
        return () => controller.abort();
    }, [url, attempt, invalid]);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname, page]);

    const active = result.url === url ? result : undefined;
    if (invalid || active?.status === 404) return <Navigate to="/404" replace />;
    if (active?.status === 401 || sessionExpired) return <LoginRedirect />;
    const listing = !isDetail ? (active?.data as Listing | undefined) : undefined;
    if (listing && !isNew && page > Math.max(1, listing.pages))
        return <Navigate to={`${base}?page=${Math.max(1, listing.pages)}`} replace />;
    return (
        <main className="mx-5 mt-14 mb-24 min-h-140 font-suite">
            <PageTitle title={admin ? "문의 관리" : "To. 쉼표지기"} />
            <header className="mb-8 flex items-end justify-between gap-6">
                <div>
                    <h1 className="font-seoulnamsan text-3xl text-neutral-900">
                        {admin ? "문의 관리" : "To. 쉼표지기"}
                    </h1>
                    <p className="mt-3 text-sm text-neutral-500">
                        {admin
                            ? "이용자가 보낸 의견을 살펴보고, 필요한 경우 답변을 남깁니다."
                            : "책과 주간쉼표에 전하고 싶은 이야기를 남겨주세요."}
                    </p>
                </div>
                {admin && (
                    <Link className={button} to="/management">
                        관리 대시보드
                    </Link>
                )}
            </header>
            {!active?.data ? (
                <div className="border-t border-neutral-800">
                    <BoardFeedback
                        title={
                            active?.status === 403
                                ? "문의 관리 권한이 없습니다."
                                : active?.status
                                  ? "문의를 불러오지 못했습니다."
                                  : "문의를 불러오는 중입니다."
                        }
                        error={!!active?.status}
                        onRetry={
                            active?.status && active.status !== 403
                                ? () => {
                                      setResult({ url: "" });
                                      setAttempt((n) => n + 1);
                                  }
                                : undefined
                        }
                    />
                </div>
            ) : isNew ? (
                <CreateInquiry key={location.pathname} base={base} onUnauthorized={login} />
            ) : isDetail ? (
                <InquiryDetail
                    key={route}
                    detail={active.data as Detail}
                    base={base}
                    admin={admin}
                    onUnauthorized={login}
                />
            ) : (
                <>
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg">
                            {admin ? "받은 이야기" : "내가 보낸 이야기"}{" "}
                            <span className="ml-2 text-sm text-neutral-500">
                                {listing!.total.toLocaleString("ko-KR")}
                            </span>
                        </h2>
                        {!admin && (
                            <Link className={primary} to={`${base}/new`}>
                                새 의견 남기기
                            </Link>
                        )}
                    </div>
                    <ul
                        className="border-t border-neutral-800"
                        aria-label={admin ? "받은 문의" : "내 문의 목록"}
                    >
                        {listing!.items.map((item) => (
                            <li key={item.id} className="border-b border-neutral-200">
                                <Link
                                    to={`${base}/${item.id}`}
                                    className="flex items-center gap-7 px-4 py-6 hover:bg-neutral-50"
                                >
                                    <Status answered={item.answered} category={item.category} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-neutral-500">
                                            {kinds[item.category].label}
                                        </p>
                                        <h3 className="mt-1 wrap-anywhere text-lg">{item.title}</h3>
                                        {admin && (
                                            <p className="mt-1 text-sm text-neutral-500">
                                                {item.authorName}
                                            </p>
                                        )}
                                    </div>
                                    <span className="shrink-0 text-sm text-neutral-500">
                                        <PostDate timestamp={item.createdAt} />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    {listing!.items.length === 0 && (
                        <BoardFeedback
                            title={
                                admin
                                    ? "아직 접수된 문의가 없습니다."
                                    : "아직 보낸 이야기가 없습니다. 새 의견 남기기로 첫 이야기를 전해주세요."
                            }
                        />
                    )}
                    {listing!.pages > 1 && (
                        <nav
                            aria-label="문의 목록 페이지"
                            className="mt-8 flex items-center justify-center gap-6"
                        >
                            {page > 1 && (
                                <Link className={button} to={`${base}?page=${page - 1}`}>
                                    이전
                                </Link>
                            )}
                            <span className="text-sm">
                                {page} / {listing!.pages}
                            </span>
                            {page < listing!.pages && (
                                <Link className={button} to={`${base}?page=${page + 1}`}>
                                    다음
                                </Link>
                            )}
                        </nav>
                    )}
                    {!admin && (
                        <p className="mt-5 text-xs text-neutral-500">
                            문의 내용은 작성자와 관리자만 확인할 수 있습니다.
                        </p>
                    )}
                </>
            )}
        </main>
    );
}

function Status({ answered, category }: { answered: boolean; category: Kind }) {
    return (
        <span
            className={`inline-block shrink-0 rounded-xs border px-3 py-1 text-xs ${answered ? "border-neutral-700 text-neutral-800" : "border-neutral-300 text-neutral-500"}`}
        >
            {answered ? "답변 완료" : category === "BOOK" ? "전달됨" : "접수됨"}
        </span>
    );
}

function CreateInquiry({ base, onUnauthorized }: { base: string; onUnauthorized: () => void }) {
    const uploads = useInquiryUploads(onUnauthorized);
    const [category, setCategory] = useState<Kind>("BOOK");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const busy = useRef(false);
    const navigate = useNavigate();
    const kind = kinds[category];
    async function submit(event: FormEvent) {
        event.preventDefault();
        if (busy.current) return;
        if (!title.trim() || !content.trim()) {
            setError("제목과 내용을 입력해 주세요.");
            return;
        }
        busy.current = true;
        setPending(true);
        setError("");
        let submissionStarted = false;
        try {
            const attachmentIds = await uploads.upload();
            submissionStarted = true;
            const { data } = await api.post<Detail>("inquiries", {
                category,
                title: title.trim(),
                content: content.trim(),
                attachmentIds
            });
            uploads.commit();
            navigate(`${base}/${data.inquiry.id}`, { replace: true });
        } catch (e) {
            if (errorStatus(e) === 401) onUnauthorized();
            else
                setError(
                    errorStatus(e) === 400
                        ? "제목·내용 길이와 첨부파일 형식·용량을 확인해 주세요."
                        : errorStatus(e) === 413
                          ? "파일당 50MB까지 첨부할 수 있습니다."
                          : errorStatus(e) === 404 || errorStatus(e) === 409
                            ? "첨부파일을 확인할 수 없습니다. 내 문의함에서 접수 여부를 확인하고, 미접수 상태라면 파일을 제거한 뒤 다시 첨부해 주세요."
                            : !submissionStarted
                              ? "첨부파일을 업로드하지 못했습니다. 작성 내용과 선택한 파일은 유지되니 다시 시도해 주세요."
                              : "접수 여부를 확인하지 못했습니다. 내 문의함에서 확인한 뒤 다시 시도해 주세요."
                );
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return (
        <>
            <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg">새 의견 남기기</h2>
                <Link className={button} to={base}>
                    내 문의함으로
                </Link>
            </div>
            <form onSubmit={submit} className="border-t border-neutral-800 pt-7">
                <fieldset disabled={pending}>
                    <legend className="sr-only">문의 유형</legend>
                    <div className="grid grid-cols-2 gap-4">
                        {(Object.keys(kinds) as Kind[]).map((key) => {
                            const Icon = kinds[key].icon;
                            return (
                                <button
                                    type="button"
                                    key={key}
                                    aria-pressed={category === key}
                                    onClick={() => setCategory(key)}
                                    className={`cursor-pointer rounded-xs border p-6 text-left disabled:cursor-wait ${category === key ? "border-neutral-800 bg-neutral-50" : "border-neutral-300 hover:bg-neutral-50"}`}
                                >
                                    <span className="flex items-center gap-3 text-lg">
                                        <Icon aria-hidden="true" />
                                        {kinds[key].label}
                                    </span>
                                    <span className="mt-2 block text-sm text-neutral-500">
                                        {kinds[key].short}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
                <div className="mt-7 grid grid-cols-[220px_1fr] gap-10 border-t border-neutral-200 pt-7">
                    <aside aria-live="polite">
                        <h3 className="text-lg">{kind.label}</h3>
                        <p className="mt-3 text-sm leading-7 text-neutral-500">{kind.help}</p>
                        {category === "BOOK" && (
                            <ul className="mt-5 space-y-5 text-sm leading-7">
                                <li>
                                    <h4 className="text-neutral-800">책 소개 제안</h4>
                                    <p className="text-neutral-500">
                                        책 제목·저자와 좋았던 점, 함께 읽었으면 하는 이유를
                                        알려주세요.
                                    </p>
                                </li>
                                <li>
                                    <h4 className="text-neutral-800">소개글 수정 의견</h4>
                                    <p className="text-neutral-500">
                                        해당 글의 링크와 수정할 부분, 이유나 참고 자료를 적어주세요.
                                    </p>
                                </li>
                                <li>
                                    <h4 className="text-neutral-800">쉼표지기 참여 의향</h4>
                                    <p className="text-neutral-500">
                                        함께하고 싶은 이유와 직접 소개해 보고 싶은 책을 들려주세요.
                                    </p>
                                </li>
                            </ul>
                        )}
                    </aside>
                    <div className="space-y-7">
                        {category === "BOOK" && (
                            <section
                                aria-label="책 이야기 보내기 안내"
                                className="border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm leading-7 text-neutral-600"
                            >
                                <h3 className="font-medium text-neutral-800">
                                    보내기 전에 읽어주세요
                                </h3>
                                <p className="mt-2">
                                    보내주신 이야기는 책 선정과 소개를 위한 참고 의견으로 받습니다.
                                    모든 제안을 반영하거나 개별적으로 답변드리기는 어려울 수
                                    있습니다.
                                </p>
                                <p className="mt-2">
                                    쉼표지기 활동에 관심이 있다면 참여 의향을 남겨주세요. 정식 지원
                                    접수는 아니며, 모집이나 선발을 약속하는 것은 아닙니다.
                                </p>
                            </section>
                        )}
                        <label className="block text-sm">
                            제목
                            <input
                                className={`${field} mt-2`}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="전하고 싶은 이야기를 한 줄로 적어주세요"
                                required
                                maxLength={150}
                                disabled={pending}
                            />
                        </label>
                        <label className="block text-sm">
                            내용
                            <textarea
                                className={`${field} mt-2 min-h-64 resize-y leading-8`}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={kind.placeholder}
                                required
                                maxLength={10000}
                                disabled={pending}
                            />
                        </label>
                        <div className="space-y-3">
                            <label className="block text-sm">
                                첨부파일 <span className="text-neutral-500">(선택)</span>
                                <input
                                    type="file"
                                    multiple
                                    accept={FILE_ACCEPT}
                                    onChange={uploads.select}
                                    disabled={pending}
                                    className="mt-3 block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-xs file:border file:border-neutral-300 file:bg-white file:px-4 file:py-2 disabled:opacity-50"
                                />
                            </label>
                            <p className="text-xs leading-6 text-neutral-500">
                                최대 5개 · 파일당 50MB · 전체 100MB
                                <br />
                                {FILE_EXTENSIONS.join(", ")}
                            </p>
                            <ul className="space-y-2" aria-label="선택한 첨부파일">
                                {uploads.files.map((entry) => (
                                    <li
                                        key={entry.key}
                                        className="flex items-center gap-4 border border-neutral-200 px-4 py-3 text-sm"
                                    >
                                        <span className="min-w-0 flex-1 wrap-anywhere">
                                            {entry.file.name}
                                        </span>
                                        <span className="shrink-0 text-xs text-neutral-500">
                                            {fileSize(entry.file.size)}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={pending}
                                            onClick={() => void uploads.remove(entry)}
                                            className="cursor-pointer text-neutral-600 underline underline-offset-4 disabled:opacity-50"
                                            aria-label={`${entry.file.name} 제거`}
                                        >
                                            제거
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {uploads.error && (
                                <p role="alert" className="text-sm text-red-700">
                                    {uploads.error}
                                </p>
                            )}
                            {pending && (
                                <p role="status" className="text-sm text-neutral-600">
                                    {uploads.progress}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-5">
                            <p className="text-xs text-neutral-500">
                                비밀번호 등 민감한 정보는 적지 마세요.
                            </p>
                            <button className={primary} disabled={pending}>
                                {pending ? "보내는 중…" : "의견 보내기"}
                            </button>
                        </div>
                        {error && (
                            <p role="alert" className="text-sm text-red-700">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </form>
        </>
    );
}

function InquiryDetail({
    detail,
    base,
    admin,
    onUnauthorized
}: {
    detail: Detail;
    base: string;
    admin: boolean;
    onUnauthorized: () => void;
}) {
    const [current, setCurrent] = useState(detail);
    const [answer, setAnswer] = useState(detail.answer || "");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const busy = useRef(false);
    const navigate = useNavigate();
    const item = current.inquiry;
    async function save(event: FormEvent) {
        event.preventDefault();
        if (busy.current) return;
        if (!answer.trim()) {
            setError("답변 내용을 입력해 주세요.");
            return;
        }
        busy.current = true;
        setPending(true);
        setError("");
        setNotice("");
        try {
            const { data } = await api.put<Detail>(`inquiries/admin/${item.id}/answer`, {
                content: answer.trim()
            });
            setCurrent(data);
            setAnswer(data.answer || "");
            setNotice("답변을 저장했습니다.");
        } catch (e) {
            const status = errorStatus(e);
            if (status === 401) onUnauthorized();
            else if (status === 404) navigate("/404", { replace: true });
            else
                setError(
                    status === 403
                        ? "답변을 작성할 권한이 없습니다."
                        : "답변을 저장하지 못했습니다. 다시 시도해 주세요."
                );
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return (
        <>
            <div className="mb-5 flex justify-end">
                <Link className={button} to={base}>
                    {admin ? "문의 목록으로" : "내 문의함으로"}
                </Link>
            </div>
            <article className="border-t border-neutral-800">
                <header className="border-b border-neutral-200 py-7">
                    <div className="flex items-center gap-4">
                        <Status answered={item.answered} category={item.category} />
                        <span className="text-sm text-neutral-500">
                            {kinds[item.category].label}
                        </span>
                    </div>
                    <h2 className="mt-4 wrap-anywhere text-2xl leading-relaxed">{item.title}</h2>
                    <p className="mt-3 text-sm text-neutral-500">
                        {item.authorName} · <PostDate timestamp={item.createdAt} />
                    </p>
                </header>
                <p className="whitespace-pre-wrap wrap-anywhere py-10 leading-8">
                    {current.content}
                </p>
                <InquiryAttachments
                    files={current.attachments || []}
                    onUnauthorized={onUnauthorized}
                />
                <section className="bg-neutral-50 p-7">
                    <h3 className="text-lg">
                        {!current.answer && item.category === "BOOK"
                            ? "이야기를 보내주셔서 감사합니다"
                            : "쉼표지기의 답변"}
                    </h3>
                    {current.answer ? (
                        <>
                            <p className="mt-4 whitespace-pre-wrap wrap-anywhere leading-8">
                                {current.answer}
                            </p>
                            {current.answeredAt && (
                                <p className="mt-5 text-xs text-neutral-500">
                                    <PostDate timestamp={current.answeredAt} />
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="mt-3 text-sm text-neutral-500">
                            {item.category === "BOOK"
                                ? "책 선정과 소개를 위한 참고 의견으로 전달되었습니다. 모든 제안의 반영이나 개별 답변을 약속드리기는 어려운 점 양해 부탁드립니다."
                                : "의견이 접수되었습니다. 아직 답변이 등록되지 않았습니다."}
                        </p>
                    )}
                </section>
            </article>
            {admin && (
                <form onSubmit={save} className="mt-8 space-y-4">
                    <label className="block text-sm">
                        {current.answer ? "답변 수정" : "답변 작성"}
                        <textarea
                            className={`${field} mt-2 min-h-48 resize-y leading-8`}
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            required
                            maxLength={10000}
                            disabled={pending}
                        />
                    </label>
                    <button className={primary} disabled={pending}>
                        {pending ? "저장 중…" : "답변 저장"}
                    </button>
                    {error && (
                        <p role="alert" className="text-sm text-red-700">
                            {error}
                        </p>
                    )}
                    <p role="status" className="text-sm text-neutral-600">
                        {notice}
                    </p>
                </form>
            )}
        </>
    );
}
