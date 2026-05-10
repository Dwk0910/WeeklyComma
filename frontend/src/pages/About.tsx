export default function About() {
    return (
        <div className="min-h-screen text-[#2c2c2c] selection:bg-[#e2e2e2]">
            {/* 폰트 설정: (바탕체 / Nanum Myeongjo / GOWUN BATANG) */}
            <style>{`
                @import url("https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap");
                .font-serif-custom {
                    font-family: 'Gowun Batang', serif;
                }
            `}</style>

            <div className="font-serif-custom max-w-4xl mx-auto px-8 pb-24 md:pb-40 md:pt-20">
                {/* 히어로 섹션 - 좌측 정렬 */}
                <header className="mb-24">
                    <h1 className="text-4xl md:text-5xl mb-12 tracking-tighter text-[#1a1a1a] font-bold">
                        《주간 쉼표》
                    </h1>

                    <div className="space-y-8 text-lg md:text-xl leading-relaxed text-[#4a4a4a] max-w-2xl">
                        <p className="break-keep">
                            "무슨 책을 읽어야 할까"라는 질문은 어쩌면
                            <br />
                            <span className="text-[#888]">오늘 내 마음은 어디로 향해야 할까</span>
                            라는 <br />
                            물음과 닮아 있습니다.
                        </p>
                        <p className="text-nowrap">
                            읽고 싶은 마음은 간절하지만, 정작 손에 잡히는 책 한 권을 찾지 못해 길을
                            잃어본 경험.
                            <br />
                            우리 모두에게는 그런 공허한 밤이 있었습니다.
                        </p>
                    </div>
                </header>

                {/* 본문 섹션 - 좌측 정렬의 미학 */}
                <section className="space-y-16 leading-extra-relaxed mb-40 max-w-2xl text-[1.05rem]">
                    <div>
                        <h2 className="text-2xl mb-6 text-[#1a1a1a] font-bold">
                            《주간 쉼표》는 그 막막한 밤의 정적 속에서 태어났습니다.
                        </h2>
                        <p className="break-keep text-[#444]">
                            독서의 즐거움을 아는 이도, 이제 막 첫 문장을 떼기 시작한 이도, 그저 책의
                            온기가 궁금한 이도... 그 누구라도 헤매지 않고 자신만의 문장을 골라잡을
                            수 있는 안식처가 되고자 합니다.
                        </p>
                    </div>

                    <div className="pl-6 border-l-2 border-[#e8e4db] py-2">
                        <p className="break-keep mb-6">
                            누군가는 인생을 한 권의 책에 비유하곤 하죠. <br />
                            그렇다면 묻고 싶습니다.{" "}
                            <strong>지금 당신이라는 책에는 어떤 문장들이 새겨지고 있나요?</strong>
                        </p>
                        <p className="break-keep text-[#666]">
                            쉼 없이 달려온 당신의 페이지들이 혹시 빽빽한 활자들로 지쳐 있지는
                            않은지요.
                        </p>
                    </div>

                    <p className="text-lg leading-loose text-[#5a5a5a] break-keep">
                        고단한 삶의 행간 사이, 숨이 턱 끝까지 차오를 때 잠시 멈춰 서서 찍어주는 작은
                        점 하나. 우리는 그 쉼표의 힘을 믿습니다. <br />
                        <br />
                        당신의 수많은 페이지 중, 책을 읽으며 머무르는 오늘 이 시간이 당신에게 가장
                        투명하고 평온한 쉼표가 되기를 진심으로 바랍니다.
                    </p>
                </section>

                {/* 이용 안내 (코스 섹션) - 세로 리스트 형태로 정렬 */}
                <section className="border-t border-[#eee] pt-24 max-w-2xl">
                    <h2 className="text-xs uppercase tracking-[0.4em] mb-16 text-[#9a9a9a]">
                        Guide for your comma
                    </h2>

                    <div className="space-y-20">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-16 h-1 bg-[#e8edf3] shrink-0 mt-3"></div>
                            <div>
                                <h3 className="text-xl font-bold mb-4 italic">
                                    푸른색{" "}
                                    <span className="text-sm font-normal text-gray-300 ml-2">
                                        Beginner
                                    </span>
                                </h3>
                                <p className="text-sm md:text-base leading-relaxed text-[#666] break-keep">
                                    독서라는 낯선 세계에 첫발을 내딛는 당신을 위한 길입니다. 마음의
                                    짐을 내려놓고 가볍게 산책하듯 읽을 수 있는 문장들을 모았습니다.
                                    서투른 시작이어도 괜찮습니다. 여기서부터 당신의 이야기는
                                    시작되니까요.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-16 h-1 bg-[#f3f1e8] shrink-0 mt-3"></div>
                            <div>
                                <h3 className="text-xl font-bold mb-4 italic">
                                    노란색{" "}
                                    <span className="text-sm font-normal text-gray-300 ml-2">
                                        Intermediate
                                    </span>
                                </h3>
                                <p className="text-sm md:text-base leading-relaxed text-[#666] break-keep">
                                    문장의 숲에 익숙해진 당신에게 권합니다. 조금은 가파른 언덕이
                                    나타날지도 모르지만, 그 너머에는 분명 이전보다 깊고 넓은 풍경이
                                    기다리고 있을 거예요. 망설이지 말고 당신의 감각을 믿고 나아가
                                    보세요.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="h-1 w-16 bg-[#f3e8e8] shrink-0 mt-3"></div>
                            <div>
                                <h3 className="text-xl font-bold mb-4 italic">
                                    붉은색{" "}
                                    <span className="text-sm font-normal text-gray-300 ml-2">
                                        Advanced
                                    </span>
                                </h3>
                                <p className="text-sm md:text-base leading-relaxed text-[#666] break-keep">
                                    활자 너머의 심연을 마주할 준비가 된 독서가들을 위한 자리입니다.
                                    진입장벽은 높고 공기는 차가울지 모르나, 이곳을 통과한 뒤의
                                    당신은 결코 이전과 같지 않을 것입니다. 이 고독한 도전을 기꺼이
                                    즐겨주시길.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 푸터 - 하단 좌측 정렬 */}
                <footer className="mt-48 pb-24 border-t border-[#eee] pt-12">
                    <p className="break-keep">
                        모든 문장에는 끝이 있지만, <br />
                        당신의 이야기는 쉼표를 통해 다시 이어집니다.
                    </p>
                </footer>
            </div>
        </div>
    );
}
