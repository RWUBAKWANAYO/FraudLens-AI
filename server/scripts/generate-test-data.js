import { faker } from "@faker-js/faker";
import ExcelJS from "exceljs";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";

const NUM_RECORDS = 20;
const DUPLICATE_PERCENTAGE = 0.2;
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD"];
const CHANNELS = ["web", "mobile", "pos", "atm", "api"];
const COUNTRIES = ["US", "UK", "CA", "DE", "FR", "JP", "AU"];
const CITIES = ["New York", "London", "Toronto", "Berlin", "Paris", "Tokyo", "Sydney"];
const DEVICES = ["iPhone", "Android", "Windows PC", "Mac", "iPad", "POS Terminal"];
const MCC_CODES = ["5411", "5812", "5912", "5732", "4121", "7996"];

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory: ${dataDir}`);
}

function generateRecord() {
  const amount = faker.number.float({ min: 1, max: 10000, precision: 0.01 });
  const date = faker.date.recent({ days: 30 });

  return {
    txId: faker.string.alphanumeric(12),
    partner: faker.company.name(),
    amount: amount,
    currency: faker.helpers.arrayElement(CURRENCIES),
    date: date,
    ip: faker.internet.ipv4(),
    device: faker.helpers.arrayElement(DEVICES),
    geoCountry: faker.helpers.arrayElement(COUNTRIES),
    geoCity: faker.helpers.arrayElement(CITIES),
    mcc: faker.helpers.arrayElement(MCC_CODES),
    channel: faker.helpers.arrayElement(CHANNELS),
  };
}

function generateFilename(extension, prefix = "payments") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = faker.string.alphanumeric(6).toLowerCase();
  return path.join(dataDir, `${prefix}-${timestamp}-${randomSuffix}.${extension}`);
}

function generateRecordsWithDuplicates(count = NUM_RECORDS) {
  const uniqueRecords = [];
  const allRecords = [];

  const uniqueCount = Math.floor(count * (1 - DUPLICATE_PERCENTAGE));
  for (let i = 0; i < uniqueCount; i++) {
    const record = generateRecord();
    uniqueRecords.push(record);
    allRecords.push(record);
  }

  const duplicateCount = count - uniqueCount;
  for (let i = 0; i < duplicateCount; i++) {
    const originalRecord = uniqueRecords[Math.floor(Math.random() * uniqueRecords.length)];

    const duplicate = {
      ...originalRecord,
      txId: faker.string.alphanumeric(12),
    };

    allRecords.push(duplicate);
  }

  for (let i = allRecords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allRecords[i], allRecords[j]] = [allRecords[j], allRecords[i]];
  }

  return allRecords;
}

async function generateJSON(count = NUM_RECORDS) {
  const filename = generateFilename("json");
  const records = generateRecordsWithDuplicates(count);

  fs.writeFileSync(filename, JSON.stringify(records, null, 2));
  console.log(`Generated ${count} records in ${filename} (including duplicates)`);
  return filename;
}

async function generateCSV(count = NUM_RECORDS) {
  const filename = generateFilename("csv");
  const records = generateRecordsWithDuplicates(count);

  const csvWriter = createObjectCsvWriter({
    path: filename,
    header: [
      { id: "txId", title: "Transaction ID" },
      { id: "partner", title: "Partner" },
      { id: "amount", title: "Amount" },
      { id: "currency", title: "Currency" },
      { id: "date", title: "Date" },
      { id: "ip", title: "IP Address" },
      { id: "device", title: "Device" },
      { id: "geoCountry", title: "Geo Country" },
      { id: "geoCity", title: "Geo City" },
      { id: "mcc", title: "MCC" },
      { id: "channel", title: "Channel" },
    ],
  });

  await csvWriter.writeRecords(records);
  console.log(`Generated ${count} records in ${filename} (including duplicates)`);
  return filename;
}

async function generateXLSX(count = NUM_RECORDS) {
  const filename = generateFilename("xlsx");
  const records = generateRecordsWithDuplicates(count);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Records");

  worksheet.columns = [
    { header: "Transaction ID", key: "txId", width: 15 },
    { header: "Partner", key: "partner", width: 25 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Date", key: "date", width: 20 },
    { header: "IP Address", key: "ip", width: 15 },
    { header: "Device", key: "device", width: 15 },
    { header: "Geo Country", key: "geoCountry", width: 12 },
    { header: "Geo City", key: "geoCity", width: 15 },
    { header: "MCC", key: "mcc", width: 8 },
    { header: "Channel", key: "channel", width: 10 },
  ];

  worksheet.addRows(records);

  await workbook.xlsx.writeFile(filename);
  console.log(`Generated ${count} records in ${filename} (including duplicates)`);
  return filename;
}

async function generateAllFormats(count = NUM_RECORDS) {
  console.log("Generating test data with duplicates...");

  try {
    const jsonFile = await generateJSON(count);
    const csvFile = await generateCSV(count);
    const xlsxFile = await generateXLSX(count);

    console.log("\nAll files generated successfully!");
    console.log(`JSON: ${jsonFile}`);
    console.log(`CSV: ${csvFile}`);
    console.log(`XLSX: ${xlsxFile}`);

    return { jsonFile, csvFile, xlsxFile };
  } catch (error) {
    console.error("Error generating files:", error);
    throw error;
  }
}

function cleanupOldFiles(maxAgeHours = 24) {
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(dataDir);
    let removedCount = 0;

    files.forEach((file) => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`Removed old file: ${file}`);
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old files from data directory`);
    }
  } catch (error) {
    console.warn("Could not clean up old files:", error.message);
  }
}

async function main() {
  const format = process.argv[2] || "all";
  const count = parseInt(process.argv[3]) || NUM_RECORDS;
  const cleanup = process.argv.includes("--cleanup");

  if (cleanup) {
    cleanupOldFiles();
  }

  switch (format) {
    case "json":
      await generateJSON(count);
      break;
    case "csv":
      await generateCSV(count);
      break;
    case "xlsx":
      await generateXLSX(count);
      break;
    case "all":
    default:
      await generateAllFormats(count);
      break;
  }
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main().catch(console.error);
