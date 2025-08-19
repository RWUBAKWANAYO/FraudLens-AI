import { Router } from "express";
import { checkFraud, testConnection } from "../controllers/transactions";
import { createEmployee, ingestCommunication } from "../controllers/ingest";

const router = Router();

router.get("/test", testConnection);

router.post("/employees", createEmployee);

router.post("/communications", ingestCommunication);

router.post("/fraud-check", checkFraud);

export { router };
