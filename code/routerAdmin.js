import AdminJS from 'adminjs';
import * as AdminJSMongoose from '@adminjs/mongoose';
import AdminJSExpress from '@adminjs/express';
import { MessageModel, UserModel, WaveInviteModel, WaveModel } from './MongooseModels.js';
import SessionStore from './SessionStore.js';
import config from './Config.js';

AdminJS.registerAdapter({
    Resource: AdminJSMongoose.Resource,
    Database: AdminJSMongoose.Database,
});

const DEFAULT_ADMIN = {
    email: 'admin',
    password: config.adminPass,
};

const authenticate = async (email, password) => {
    if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
        return Promise.resolve(DEFAULT_ADMIN);
    }
    return null;
};


export function startRouterAdmin() {
    const admin = new AdminJS({
        resources: [UserModel, WaveModel, MessageModel, WaveInviteModel],
    });

    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
        admin,
        {
            authenticate,
            cookieName: 'adminjs',
            cookiePassword: 'adminSessionsecret9',
        },
        null,
        {
            store: SessionStore,
            resave: true,
            saveUninitialized: true,
            secret: 'adminSessionsecret9',
            cookie: {
                httpOnly: process.env.NODE_ENV === 'production',
                secure: process.env.NODE_ENV === 'production',
            },
            name: 'adminjs',
        }
    );

    return adminRouter;
}
