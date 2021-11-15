const config = require('config');
const logger = require('logger');
const path = require('path');
const convert = require('koa-convert');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');
const koa = require('koa');
const koaLogger = require('koa-logger');
const loader = require('loader');
const ErrorSerializer = require('serializers/errorSerializer');
const mongoose = require('mongoose');
const sleep = require('sleep');
const loggedInUserService = require('./services/LoggedInUserService');

const mongoUri = process.env.MONGO_URI || (`mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`);
mongoose.Promise = Promise;

const koaBody = require('koa-body')({
    multipart: true,
    formidable: {
        uploadDir: '/tmp',
        onFileBegin(name, file) {
            const folder = path.dirname(file.path);
            file.path = path.join(folder, file.name);
        }
    }
});

let retries = 10;

async function init() {
    return new Promise((resolve, reject) => {
        async function onDbReady(err) {
            if (err) {
                if (retries >= 0) {
                    // eslint-disable-next-line no-plusplus
                    retries--;
                    logger.error(`Failed to connect to MongoDB uri ${mongoUri}, retrying...`);
                    sleep.sleep(5);
                    mongoose.connect(mongoUri, onDbReady);
                } else {
                    logger.error('MongoURI', mongoUri);
                    logger.error(err);
                    reject(new Error(err));
                }

                return;
            }

            const app = koa();

            // if environment is dev then load koa-logger
            if (process.env.NODE_ENV === 'dev') {
                app.use(koaLogger());
            }
            app.use(koaBody);

            require('koa-validate')(app);
            // catch errors and send in jsonapi standard. Always return vnd.api+json
            app.use(function* handleErrors(next) {
                try {
                    yield next;
                } catch (inErr) {
                    let error = inErr;
                    try {
                        error = JSON.parse(inErr);
                    } catch (e) {
                        logger.debug('Could not parse error message - is it JSON?: ', inErr);
                        error = inErr;
                    }
                    this.status = error.status || this.status || 500;
                    if (this.status >= 500) {
                        logger.error(error);
                    } else {
                        logger.info(error);
                    }

                    this.body = ErrorSerializer.serializeError(this.status, error.message);
                    if (process.env.NODE_ENV === 'prod' && this.status === 500) {
                        this.body = 'Unexpected error';
                    }
                }
                this.response.type = 'application/vnd.api+json';
            });

            app.use(convert.back(koaSimpleHealthCheck()));

            app.use(convert.back(async (ctx, next) => {
                await loggedInUserService.setLoggedInUser(ctx, logger);
                await next();
            }));

            // load routes
            loader.loadRoutes(app);

            // Instance of http module
            const appServer = require('http').Server(app.callback());

            // get port of environment, if not exist obtain of the config.
            // In production environment, the port must be declared in environment variable
            const port = process.env.PORT || config.get('service.port');

            logger.info(`Server started in port:${port}`);

            const server = app.listen(process.env.PORT, () => {
            });
        }

        mongoose.connect(mongoUri)
            .then(onDbReady)
            .catch((err) => {
                logger.error(err);
                throw new Error(err);
            });

    });
}

module.exports = init;
