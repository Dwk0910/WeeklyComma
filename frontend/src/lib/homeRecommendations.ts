export const recommendationCourses = [
    { key: "low", label: "초급" },
    { key: "mid", label: "중급" },
    { key: "high", label: "상급" }
] as const;
export type HomeCourse = (typeof recommendationCourses)[number]["key"];
export type HomeSelection = { isbn: string; postId: string | null };
export type HomeSelections = Partial<Record<HomeCourse, HomeSelection>>;

export function registeredCourses(selections: HomeSelections) {
    return recommendationCourses.filter((course) => selections[course.key]?.isbn.trim());
}

export function initialCourse(selections: HomeSelections, preferred: string | null) {
    const available = registeredCourses(selections);
    return available.find((course) => course.key === preferred)?.key ?? available[0]?.key ?? null;
}
