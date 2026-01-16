import cron from 'node-cron';
import processEmails from './index.js';
import logger from './src/logger.js';

logger.info('========== 启动定时任务 ==========');
logger.info('每日 8:00 自动处理邮件');
logger.info('按 Ctrl+C 停止');

// 定时任务：每天早上 8:00 执行
// Cron 表达式: 分 时 日 月 周
// 0 8 * * * = 每天 8:00
cron.schedule('0 8 * * *', async () => {
    logger.info('\n========== 定时任务触发 ==========');
    try {
        const result = await processEmails();
        logger.success(`定时任务完成！处理了 ${result.processed} 封邮件`);
    } catch (error) {
        logger.error('定时任务执行失败', error);
    }
}, {
    timezone: 'Asia/Shanghai'
});

logger.success('定时任务已启动，等待执行...');

// 可选：立即执行一次（用于测试）
// logger.info('\n立即执行一次测试...');
// processEmails().catch(error => logger.error('测试执行失败', error));
