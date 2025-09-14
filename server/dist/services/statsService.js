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
const constants_1 = require("../utils/constants");
const db_1 = require("../config/db");
class StatsService {
    static getCompanyStats(companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lastMonthDate = new Date();
            lastMonthDate.setDate(lastMonthDate.getDate() - 30);
            const [totalFiles, filesSinceLastMonth, totalRecords, recordsSinceLastMonth, totalFrauds, fraudsSinceLastMonth, totalUsers, usersSinceLastMonth, fileSize, allFiles,] = yield Promise.all([
                db_1.prisma.upload.count({
                    where: {
                        companyId,
                        OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
                    },
                }),
                db_1.prisma.upload.count({
                    where: {
                        companyId,
                        createdAt: { gte: lastMonthDate },
                        OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
                    },
                }),
                db_1.prisma.record.count({ where: { companyId } }),
                db_1.prisma.record.count({
                    where: {
                        companyId,
                        createdAt: { gte: lastMonthDate },
                    },
                }),
                db_1.prisma.threat.count({
                    where: { companyId },
                }),
                db_1.prisma.threat.count({
                    where: {
                        companyId,
                        createdAt: { gte: lastMonthDate },
                    },
                }),
                db_1.prisma.user.count({ where: { companyId } }),
                db_1.prisma.user.count({
                    where: {
                        companyId,
                        createdAt: { gte: lastMonthDate },
                    },
                }),
                db_1.prisma.upload.aggregate({
                    where: {
                        companyId,
                        fileSize: { gt: 0 },
                    },
                    _sum: { fileSize: true },
                }),
                db_1.prisma.upload.findMany({
                    where: {
                        companyId,
                        OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
                    },
                    select: {
                        fileType: true,
                        fileName: true,
                        createdAt: true,
                    },
                }),
            ]);
            const fileTypeStats = {
                pdf: 0,
                csv: 0,
                excel: 0,
                json: 0,
                other: 0,
            };
            allFiles.forEach((file) => {
                var _a, _b;
                const fileType = ((_a = file.fileType) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
                const fileName = ((_b = file.fileName) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
                if (this.isPdfFile(fileName, fileType)) {
                    fileTypeStats.pdf++;
                }
                else if (this.isCsvFile(fileName, fileType)) {
                    fileTypeStats.csv++;
                }
                else if (this.isExcelFile(fileName, fileType)) {
                    fileTypeStats.excel++;
                }
                else if (this.isJsonFile(fileName, fileType)) {
                    fileTypeStats.json++;
                }
                else {
                    fileTypeStats.other++;
                }
            });
            return {
                users: {
                    total: totalUsers,
                    newSinceLastMonth: usersSinceLastMonth,
                },
                frauds: {
                    total: totalFrauds,
                    newSinceLastMonth: fraudsSinceLastMonth,
                },
                files: {
                    total: totalFiles,
                    newSinceLastMonth: filesSinceLastMonth,
                    byType: fileTypeStats,
                },
                records: {
                    total: totalRecords,
                    newSinceLastMonth: recordsSinceLastMonth,
                },
                totalFileSize: fileSize._sum.fileSize || 0,
                period: {
                    since: lastMonthDate.toISOString(),
                    until: new Date().toISOString(),
                },
            };
        });
    }
    static isPdfFile(fileName, fileType) {
        const pdfExtensions = [".pdf"];
        return (pdfExtensions.some((ext) => fileName.endsWith(ext)) ||
            constants_1.pdfMimeTypes.some((mime) => fileType.includes(mime)));
    }
    static isCsvFile(fileName, fileType) {
        const csvExtensions = [".csv", ".tsv", ".txt"];
        return (csvExtensions.some((ext) => fileName.endsWith(ext)) ||
            constants_1.csvMimeTypes.some((mime) => fileType.includes(mime)) ||
            (fileType.includes("text/plain") && (fileName.includes("csv") || fileName.includes("comma"))));
    }
    static isExcelFile(fileName, fileType) {
        const excelExtensions = [".xls", ".xlsx", ".xlsm", ".xlsb", ".xlt", ".xltx", ".xltm"];
        return (excelExtensions.some((ext) => fileName.endsWith(ext)) ||
            constants_1.excelMimeTypes.some((mime) => fileType.includes(mime)) ||
            fileType.includes("spreadsheet") ||
            fileName.includes("excel") ||
            (fileType.includes("application/octet-stream") &&
                excelExtensions.some((ext) => fileName.includes(ext))));
    }
    static isJsonFile(fileName, fileType) {
        const jsonExtensions = [".json", ".jsonl", ".ndjson"];
        return (jsonExtensions.some((ext) => fileName.endsWith(ext)) ||
            constants_1.jsonMimeTypes.some((mime) => fileType.includes(mime)));
    }
}
exports.StatsService = StatsService;
