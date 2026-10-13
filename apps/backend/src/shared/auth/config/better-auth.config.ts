import { APIError, createAuthMiddleware } from 'better-auth/api';
import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';
import { z } from 'zod';

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      bio: {
        type: 'string',
        required: true,
        defaultValue: '',
        validator: { input: z.string().max(160) },
      },
      defaultMood: {
        type: 'string',
        required: true,
        defaultValue: '',
        validator: { input: z.enum(['', 'happy', 'sad', 'angry', 'silly']) },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== '/update-user') return;

      const name = (context.body as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim().length === 0) {
        throw new APIError('BAD_REQUEST', {
          message: 'Display name is required',
        });
      }
    }),
  },
  plugins: [
    openAPI(),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: (value) => /^[a-zA-Z0-9._]+$/.test(value),
    }),
  ],
};
