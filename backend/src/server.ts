import "dotenv/config";
import { buildApp } from "./app";

const app = buildApp();
const port = Number(process.env.PORT || 4000);

app.listen({ port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`Server running on http://0.0.0.0:${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
