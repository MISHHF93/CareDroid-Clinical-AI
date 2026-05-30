import { Logger } from '@nestjs/common';

Logger.overrideLogger(false);
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();
Logger.prototype.log = jest.fn();
Logger.prototype.debug = jest.fn();
Logger.error = jest.fn();
Logger.warn = jest.fn();
Logger.log = jest.fn();
Logger.debug = jest.fn();
