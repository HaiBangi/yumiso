import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      pseudo?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    pseudo?: string;
  }
}

