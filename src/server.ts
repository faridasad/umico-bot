import { buildApp } from "./app";
import { config } from "./config";
import { authRoutes } from "./modules/auth/routes";
import { ProductsService } from "./modules/products/service";

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({
      port: config.server.port as number,
      host: config.server.host,
    });
    app.log.info(`Server is running on ${config.server.host}:${config.server.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
