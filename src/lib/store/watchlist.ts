// 自选股仓库统一入口：真实实现位于 lib/watchlist，本文件仅做兼容性转发，
// 避免 store 与 watchlist 分支各维护一套接口与单例。

export {
  buildWatchlistItem,
  watchlistRepository,
  watchlistRepository as watchlistStore,
  type WatchlistAddInput,
  type WatchlistNoteInput,
  type WatchlistReorderInput,
  type WatchlistRepository,
} from "@/lib/watchlist";
