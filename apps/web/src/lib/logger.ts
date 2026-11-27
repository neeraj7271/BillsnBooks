type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const currentLevel: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'silent' : 'warn');

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export const logger = {
  debug: (...args: any[]) => {
    if (levels[currentLevel] <= levels.debug) console.log(...args);
  },
  info: (...args: any[]) => {
    if (levels[currentLevel] <= levels.info) console.info(...args);
  },
  warn: (...args: any[]) => {
    if (levels[currentLevel] <= levels.warn) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (levels[currentLevel] <= levels.error) console.error(...args);
  },
};
