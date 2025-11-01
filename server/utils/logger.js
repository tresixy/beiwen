import pino from 'pino';
import pinoHttp from 'pino-http';
import { nanoid } from 'nanoid';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: () => nanoid(),
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});

export default logger;

