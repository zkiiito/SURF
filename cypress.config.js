import { defineConfig } from 'cypress';
import { registerReactFixtureServer } from './cypress/support/reactFixtureServer.js';

export default defineConfig({
    e2e: {
        supportFile: false,
        setupNodeEvents(on) {
            registerReactFixtureServer(on);
        },
    }
});
