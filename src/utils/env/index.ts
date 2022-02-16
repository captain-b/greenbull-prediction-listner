import dotenv from "dotenv";

/**
 * Initialises our env variables.
 */
export const InitEnvVars = () => {
    if (process.env.NODE_ENV === 'local-dev') {
        dotenv.config();
    }
}