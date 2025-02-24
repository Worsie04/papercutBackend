"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate_regular = exports.validate = void 0;
const zod_1 = require("zod");
const errorHandler_1 = require("./errorHandler");
const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    }
    catch (error) {
        return res.status(400).json(error);
    }
};
exports.validate = validate;
const validate_regular = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next(new errorHandler_1.AppError(400, error.errors[0].message));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validate_regular = validate_regular;
