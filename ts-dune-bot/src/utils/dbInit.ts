import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

export async function ensureDatabaseInitialized() {
    const prisma = new PrismaClient();
    try {
        await prisma.game.count();
    } catch (error: any) {
        if (error.code === 'P2021') {
            console.log("Database not initialized. Initializing...");
            try {
                console.log("Pushing database schema...");
                execSync("npx prisma db push", { stdio: 'inherit' });
                console.log("Seeding database...");
                execSync("npx prisma db seed", { stdio: 'inherit' });
                console.log("Database initialized successfully.");
            } catch (initError) {
                console.error("Failed to initialize database:", initError);
                throw initError;
            }
        } else {
            console.error("Database connection error:", error);
            throw error;
        }
    } finally {
        await prisma.$disconnect();
    }
}
