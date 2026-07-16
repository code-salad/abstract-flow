export type Req = {
  body: { cart?: { items: { sku: string; qty: number }[] }; couponCode?: string };
  userId: string;
  params: Record<string, string>;
};

export type Res = {
  status(code: number): Res;
  json(payload: unknown): Res;
};

export type Handler = (req: Req, res: Res) => unknown;

export type App = {
  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
};

export function createServer(): App {
  const routes: { method: string; path: string; handler: Handler }[] = [];
  return {
    get(path: string, handler: Handler) {
      routes.push({ method: "GET", path, handler });
    },
    post(path: string, handler: Handler) {
      routes.push({ method: "POST", path, handler });
    },
  };
}
