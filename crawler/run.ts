import { runCrawl } from "./core/engine";
import { adapters } from "./adapters";

runCrawl(adapters).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
