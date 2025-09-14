"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const db_1 = require("../config/db");
class StatsService {
    static getCompanyStats(companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [files, records, frauds, users, fileSize] = yield Promise.all([
                db_1.prisma.upload.count({
                    where: {
                        companyId,
                        OR: [{ fileSize: { gt: 0 } }, { fileName: { not: "direct-upload.json" } }],
                    },
                }),
                db_1.prisma.record.count({ where: { companyId } }),
                db_1.prisma.threat.count({
                    where: { companyId },
                }),
                db_1.prisma.user.count({ where: { companyId } }),
                db_1.prisma.upload.aggregate({
                    where: {
                        companyId,
                        fileSize: { gt: 0 },
                    },
                    _sum: { fileSize: true },
                }),
            ]);
            return {
                totalFiles: files,
                totalRecords: records,
                totalFrauds: frauds,
                totalUsers: users,
                totalFileSize: fileSize._sum.fileSize || 0,
                formattedFileSize: fileSize._sum.fileSize || 0,
            };
        });
    }
}
exports.StatsService = StatsService;
