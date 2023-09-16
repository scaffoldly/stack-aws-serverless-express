import Joi from 'joi';
import { encryptedFieldSchema } from './EncryptedField';

export const githubLogin = {
  pk: Joi.string()
    .required()
    .regex(/github_(.*)/), // github_${state}
  sk: Joi.string()
    .required()
    .regex(/login_(.*)/), // login_${clientId}
  state: Joi.string().required(),
  clientId: Joi.string().required(),
  scope: Joi.string().required(),
  oauthRedirectUri: Joi.string().required(),
  redirectUri: Joi.string().required(),
  remember: Joi.boolean().optional(),
  login: Joi.string().optional(),
  email: Joi.string().optional(),
  encryptedToken: encryptedFieldSchema.optional(),
  appId: Joi.number().optional(),
  installationId: Joi.number().optional(),
  expires: Joi.number().optional(),
};

export const githubLoginSchema = Joi.object(githubLogin).label('GithubLogin');
