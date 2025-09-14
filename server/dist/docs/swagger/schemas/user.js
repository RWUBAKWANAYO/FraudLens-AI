"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchemas = void 0;
exports.userSchemas = {
    User: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "b52ccc3f-631c-47ab-8e90-7cbc5b2e19ec",
            },
            email: {
                type: "string",
                format: "email",
                example: "humblenayo@gmail.com",
            },
            fullName: {
                type: "string",
                example: "Humble Nayo",
            },
            role: {
                type: "string",
                enum: ["ADMIN", "MANAGER", "ANALYST", "USER"],
                example: "ADMIN",
            },
            isVerified: {
                type: "boolean",
                example: true,
            },
            lastLogin: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: "2025-08-30T08:31:25.063Z",
            },
            createdAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-28T21:36:50.203Z",
            },
            invitedBy: {
                type: "object",
                nullable: true,
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        example: "b52ccc3f-631c-47ab-8e90-7cbc5b2e19ec",
                    },
                    fullName: {
                        type: "string",
                        example: "Humble Nayo",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "humblenayo@gmail.com",
                    },
                },
            },
        },
    },
    UserRoleUpdate: {
        type: "object",
        required: ["role"],
        properties: {
            role: {
                type: "string",
                enum: ["ADMIN", "MANAGER", "ANALYST", "USER"],
                example: "ANALYST",
            },
        },
    },
    UserRoleUpdateResponse: {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "User role updated successfully",
            },
            user: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        example: "ea8f72ce-43a5-44b1-84e7-2713eefc8cbb",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "rubymutsinziruby@gmail.com",
                    },
                    role: {
                        type: "string",
                        enum: ["ADMIN", "MANAGER", "ANALYST", "USER"],
                        example: "ANALYST",
                    },
                },
            },
        },
    },
    UserDeleteResponse: {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "User removed successfully",
            },
        },
    },
    Inviter: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "b52ccc3f-631c-47ab-8e90-7cbc5b2e19ec",
            },
            fullName: {
                type: "string",
                example: "Humble Nayo",
            },
            email: {
                type: "string",
                format: "email",
                example: "humblenayo@gmail.com",
            },
        },
    },
};
