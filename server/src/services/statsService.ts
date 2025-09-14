import { csvMimeTypes, excelMimeTypes, jsonMimeTypes, pdfMimeTypes } from "../utils/constants";
import { prisma } from "../config/db";

export class StatsService {
  static async getCompanyStats(companyId: string) {
    const lastMonthDate = new Date();
    lastMonthDate.setDate(lastMonthDate.getDate() - 30);

    const [
      totalFiles,
      filesSinceLastMonth,
      totalRecords,
      recordsSinceLastMonth,
      totalFrauds,
      fraudsSinceLastMonth,
      totalUsers,
      usersSinceLastMonth,
      fileSize,
      allFiles,
    ] = await Promise.all([
      prisma.upload.count({
        where: {
          companyId,
          OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
        },
      }),

      prisma.upload.count({
        where: {
          companyId,
          createdAt: { gte: lastMonthDate },
          OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
        },
      }),

      prisma.record.count({ where: { companyId } }),

      prisma.record.count({
        where: {
          companyId,
          createdAt: { gte: lastMonthDate },
        },
      }),

      prisma.threat.count({
        where: { companyId },
      }),

      prisma.threat.count({
        where: {
          companyId,
          createdAt: { gte: lastMonthDate },
        },
      }),

      prisma.user.count({ where: { companyId } }),

      prisma.user.count({
        where: {
          companyId,
          createdAt: { gte: lastMonthDate },
        },
      }),

      prisma.upload.aggregate({
        where: {
          companyId,
          fileSize: { gt: 0 },
        },
        _sum: { fileSize: true },
      }),

      prisma.upload.findMany({
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
      const fileType = file.fileType?.toLowerCase() || "";
      const fileName = file.fileName?.toLowerCase() || "";

      if (this.isPdfFile(fileName, fileType)) {
        fileTypeStats.pdf++;
      } else if (this.isCsvFile(fileName, fileType)) {
        fileTypeStats.csv++;
      } else if (this.isExcelFile(fileName, fileType)) {
        fileTypeStats.excel++;
      } else if (this.isJsonFile(fileName, fileType)) {
        fileTypeStats.json++;
      } else {
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
  }

  private static isPdfFile(fileName: string, fileType: string): boolean {
    const pdfExtensions = [".pdf"];

    return (
      pdfExtensions.some((ext) => fileName.endsWith(ext)) ||
      pdfMimeTypes.some((mime) => fileType.includes(mime))
    );
  }

  private static isCsvFile(fileName: string, fileType: string): boolean {
    const csvExtensions = [".csv", ".tsv", ".txt"];

    return (
      csvExtensions.some((ext) => fileName.endsWith(ext)) ||
      csvMimeTypes.some((mime) => fileType.includes(mime)) ||
      (fileType.includes("text/plain") && (fileName.includes("csv") || fileName.includes("comma")))
    );
  }

  private static isExcelFile(fileName: string, fileType: string): boolean {
    const excelExtensions = [".xls", ".xlsx", ".xlsm", ".xlsb", ".xlt", ".xltx", ".xltm"];

    return (
      excelExtensions.some((ext) => fileName.endsWith(ext)) ||
      excelMimeTypes.some((mime) => fileType.includes(mime)) ||
      fileType.includes("spreadsheet") ||
      fileName.includes("excel") ||
      (fileType.includes("application/octet-stream") &&
        excelExtensions.some((ext) => fileName.includes(ext)))
    );
  }

  private static isJsonFile(fileName: string, fileType: string): boolean {
    const jsonExtensions = [".json", ".jsonl", ".ndjson"];

    return (
      jsonExtensions.some((ext) => fileName.endsWith(ext)) ||
      jsonMimeTypes.some((mime) => fileType.includes(mime))
    );
  }
}
