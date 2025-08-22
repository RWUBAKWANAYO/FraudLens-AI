"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoForestScores = isoForestScores;
const isolation_forest_1 = require("isolation-forest");
function isoForestScores(amounts) {
    if (amounts.length < 25)
        return [];
    const iso = new isolation_forest_1.IsolationForest();
    const X = amounts.map((a) => ({ amount: a }));
    iso.fit(X);
    return iso.scores();
}
