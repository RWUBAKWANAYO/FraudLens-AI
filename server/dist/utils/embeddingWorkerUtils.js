"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBatches = createBatches;
exports.calculateProgress = calculateProgress;
function createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}
function calculateProgress(currentIndex, totalBatches, startPercent, rangePercent) {
    return startPercent + Math.round(((currentIndex + 1) / totalBatches) * rangePercent);
}
