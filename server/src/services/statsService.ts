import { prisma } from "../config/db";

export class StatsService {
  static async getCompanyStats(companyId: string) {
    const [files, records, frauds, users, fileSize] = await Promise.all([
      prisma.upload.count({
        where: {
          companyId,
          OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
        },
      }),
      prisma.record.count({ where: { companyId } }),
      prisma.threat.count({
        where: { companyId },
      }),
      prisma.user.count({ where: { companyId } }),
      prisma.upload.aggregate({
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
    };
  }
}
