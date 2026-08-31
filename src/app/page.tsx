import { Button } from "@/components/ui/button";

/** 首页占位：仅用于验证工程可运行，后续分支替换为盘面首页。 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">个股盘面分析</h1>
      <p className="max-w-xl text-center text-sm text-muted-foreground">
        P1 工程骨架已就绪：Next.js + TypeScript + Tailwind + shadcn/ui，
        行情侧车为 FastAPI。
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <a href="/api/health">查看 API 健康检查</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="http://127.0.0.1:8000/health">查看行情侧车健康检查</a>
        </Button>
      </div>
    </main>
  );
}
