import { randomUUID } from 'crypto';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = randomUUID();
  req.requestId = requestId;

  res.on('finish', () => {
    const log = {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start,
    };
    if (req.user) {
      log.user_id = req.user.userId;
      log.shop_id = req.user.shopId;
    }
    console.log(JSON.stringify(log));
  });

  next();
}
