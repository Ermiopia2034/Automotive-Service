import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { verifyPassword } from '@/utils/password';
import { UserType } from '@/generated/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password || !credentials?.userType) {
          return null;
        }

        try {
          const user = await prisma.user.findFirst({
            where: {
              username: credentials.username,
              userType: credentials.userType as UserType,
            },
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userType = (user as unknown as { userType: string }).userType;
        token.firstName = (user as unknown as { firstName: string }).firstName;
        token.lastName = (user as unknown as { lastName: string }).lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as unknown as { id: string }).id = token.id as string;
        (session.user as unknown as { userType: string }).userType = token.userType as string;
        (session.user as unknown as { firstName: string }).firstName = token.firstName as string;
        (session.user as unknown as { lastName: string }).lastName = token.lastName as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};