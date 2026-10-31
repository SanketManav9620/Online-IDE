"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";


export const getUserById = async (id: string) => {
    if (!id) return null;
    try {
        const user = await db.user.findUnique({
            where: { id },
            include: { accounts: true }
        });
        return user;
    } catch (error) {
        // Return null gracefully if DB is offline/unreachable
        return null;
    }
}

export const getAccountByUserId = async (userId: string) => {
    if (!userId) return null;
    try {
        const account = await db.account.findFirst({
            where: {
                userId
            }
        });
        return account;
    } catch (error) {
        // Return null gracefully if DB is offline/unreachable
        return null;
    }
}

export const currentUser = async()=>{
    const user = await auth()
    return user?.user;
}