"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDatabaseInitialized = ensureDatabaseInitialized;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
async function ensureDatabaseInitialized() {
    const prisma = new client_1.PrismaClient();
    try {
        await prisma.game.count();
    }
    catch (error) {
        if (error.code === 'P2021') {
            console.log("Database not initialized. Initializing...");
            try {
                console.log("Pushing database schema...");
                (0, child_process_1.execSync)("npx prisma db push", { stdio: 'inherit' });
                console.log("Seeding database...");
                (0, child_process_1.execSync)("npx prisma db seed", { stdio: 'inherit' });
                console.log("Database initialized successfully.");
            }
            catch (initError) {
                console.error("Failed to initialize database:", initError);
                throw initError;
            }
        }
        else {
            console.error("Database connection error:", error);
            throw error;
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
