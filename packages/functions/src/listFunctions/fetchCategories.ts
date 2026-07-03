import { prisma } from "@repo/database";
import { AppError } from "../error.js";

export async function fetchCategories(){
    try {
        const result = await prisma.category.findMany({
            orderBy: {
                createdAt: "asc"
            }
        });

        return {
            status: 200,
            result
        }
    }catch(error){
        throw new AppError(500,"Internal Error")
    }
}