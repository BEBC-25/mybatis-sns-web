import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { useFeedPosts } from "@/hooks/useFeedPosts";

const keywordChips = ["Docker", "GitHub", "스터디", "알고리즘"] as const;

export function FeedPage() {
  const [keywordInput, setKeywordInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const { posts, status, errorMessage } = useFeedPosts(appliedKeyword);

  function applyKeyword(nextKeyword: string) {
    setKeywordInput(nextKeyword);
    setAppliedKeyword(nextKeyword.trim());
  }

  return (
    <div>
      <section className="bg-mint/40 px-4 py-8 dark:bg-[#24302c]/50">
        <div className="mx-auto w-full max-w-xl text-center">
          <h1 className="font-pixel text-lg leading-relaxed md:text-2xl">
            <span className="text-accent">피드의 첫걸음,</span>
            <br />
            어디서부터 시작할지 막막하다면?
          </h1>
          <form
            className="pixel-shadow mt-5 flex items-center gap-1.5 border-2 border-ink bg-cream p-1 dark:border-lilac dark:bg-[#3a3145]"
            onSubmit={(event) => {
              event.preventDefault();
              applyKeyword(keywordInput);
            }}
          >
            <Sparkles className="ml-2 size-3.5 shrink-0 text-accent" aria-hidden="true" />
            <label className="sr-only" htmlFor="feed-keyword">
              검색 키워드
            </label>
            <input
              id="feed-keyword"
              value={keywordInput}
              onChange={(event) => {
                setKeywordInput(event.target.value);
              }}
              placeholder="게시글 본문을 검색하세요."
              className="h-8 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink/40 dark:text-lilac dark:placeholder:text-lilac/50"
            />
            <button
              type="submit"
              className="flex size-8 shrink-0 items-center justify-center bg-accent text-white"
              aria-label="검색"
            >
              <ArrowRight className="size-3.5" />
            </button>
          </form>
          <p className="mt-4 text-left font-pixel text-[11px] text-ink/70 dark:text-lilac/70">
            이런 키워드로 대화를 시작해보세요.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {keywordChips.map((chip) => (
              <li key={chip}>
                <button
                  type="button"
                  onClick={() => {
                    applyKeyword(chip);
                  }}
                  className="border-2 border-ink bg-cream px-2.5 py-1 font-pixel text-[11px] text-ink dark:border-lilac dark:bg-[#3a3145] dark:text-lilac"
                >
                  {chip}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-pixel text-lg text-ink dark:text-lilac">실시간 인기있는 피드</h2>
          <p className="font-pixel text-[11px] text-ink/60 dark:text-lilac/60">더 보기 &gt;</p>
        </div>
        {status === "loading" ? (
          <p className="py-16 text-center font-pixel text-sm text-ink/70 dark:text-lilac/70">
            피드를 불러오는 중입니다.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="py-16 text-center font-pixel text-sm text-accent">{errorMessage}</p>
        ) : null}
        {status === "success" && posts.length === 0 ? (
          <p className="py-16 text-center font-pixel text-sm text-ink/70 dark:text-lilac/70">
            검색 조건에 부합하는 게시글이 없습니다.
          </p>
        ) : null}
        {status === "success" && posts.length > 0 ? (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
