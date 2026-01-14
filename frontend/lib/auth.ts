import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { guestRegex } from "@/lib/constants";

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    // Guest login - no database required
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        // Generate guest user without database
        const guestId = `guest-${Date.now()}`;
        return {
          id: guestId,
          email: guestId,
          name: "Guest",
          type: "guest" as UserType,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type || "guest";
      }

      // Ensure type is set for existing tokens
      if (!token.type) {
        const email = typeof token.email === "string" ? token.email : "";
        token.type = guestRegex.test(email) ? "guest" : "regular";
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? session.user.id;
        session.user.type =
          token.type ??
          (guestRegex.test(session.user.email ?? "") ? "guest" : "regular");
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // No dedicated login page - redirect to home
  },
  trustHost: true,
});
