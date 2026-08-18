const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

describe('Logger Utility', () => {
  let tempDir;
  let logger;

  beforeEach(() => {
    tempDir = path.join(__dirname, 'temp_logs_' + Date.now());
    logger = new Logger(tempDir);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      if (fs.existsSync(logger.activityLogPath)) fs.unlinkSync(logger.activityLogPath);
      if (fs.existsSync(logger.errorLogPath)) fs.unlinkSync(logger.errorLogPath);
      fs.rmdirSync(tempDir);
    }
  });

  test('should create log directory if it does not exist', () => {
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  test('should format message correctly without meta', () => {
    const msg = logger.formatMessage('INFO', 'Test message');
    expect(msg).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message\n$/);
  });

  test('should format message correctly with string meta', () => {
    const msg = logger.formatMessage('INFO', 'Test', { user: 'admin' });
    expect(msg).toContain(' | Meta: {"user":"admin"}');
  });

  test('should format message correctly with Error meta', () => {
    const err = new Error('Database disconnected');
    const msg = logger.formatMessage('ERROR', 'DB Error', { error: err });
    expect(msg).toContain('"message":"Database disconnected"');
    expect(msg).toContain('"stack":');
  });

  test('should handle circular JSON gracefully in meta', () => {
    const obj = {};
    obj.circular = obj; // Circular reference
    
    const msg = logger.formatMessage('INFO', 'Circular test', { data: obj });
    expect(msg).toContain(' | Meta: [Unserializable data]');
  });

  test('should append to activity log on info()', () => {
    logger.info('User logged in', { userId: 123 });
    const content = fs.readFileSync(logger.activityLogPath, 'utf8');
    expect(content).toContain('[INFO] User logged in');
    expect(content).toContain('{"userId":123}');
  });

  test('should append to error log on error()', () => {
    logger.error('Failed to login', { reason: 'bad password' });
    const content = fs.readFileSync(logger.errorLogPath, 'utf8');
    expect(content).toContain('[ERROR] Failed to login');
    expect(content).toContain('{"reason":"bad password"}');
  });

  test('should catch fs errors safely (e.g. read-only directory)', () => {
    // Make the file read-only or override writeLog to test error catching
    const originalAppend = fs.appendFileSync;
    fs.appendFileSync = jest.fn(() => { throw new Error('EACCES'); });
    
    // Should not throw
    expect(() => {
      logger.info('This should not crash the app');
    }).not.toThrow();

    fs.appendFileSync = originalAppend;
  });
});
