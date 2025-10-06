const logger = async (req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);

    // write log to a file
    const fs = require('fs');
    const logMessage = `${req.method} ${req.originalUrl} - ${new Date().toISOString()}\n`;

    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // create logs directory if it doesn't exist
    if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
    }

    fs.appendFile(`logs/${currentDate}.log`, logMessage, (err) => {
        if (err) {
            console.error('Failed to write log:', err);
        }
    });

    next();
}

module.exports = logger;