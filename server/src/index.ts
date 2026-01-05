import middlewares from './middlewares';

interface StrapiInstance {
    server: {
        use: (middleware: unknown) => void;
    };
}

const register = ({ strapi }: { strapi: StrapiInstance }): void => {
    // Register the random sort middleware globally
    strapi.server.use(middlewares.random);
};

const bootstrap = (): void => {
    // Bootstrap phase - nothing needed
};

const destroy = (): void => {
    // Destroy phase - nothing needed
};

export default {
    register,
    bootstrap,
    destroy,
    middlewares,
};
