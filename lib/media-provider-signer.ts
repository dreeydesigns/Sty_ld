import { v2 as cloudinary } from 'cloudinary';
import type { PendingMediaRecord } from './media-manifest';

// Token-authenticated delivery for a restricted asset. Nothing here calls the network:
// the Cloudinary helper only builds a signed URL, which is what makes this adapter
// testable without provider credentials. The proxy still re-checks every bound before
// it releases a single byte.

export interface SignedMediaLocation {
  assetId: string;
  version: number;
  expiresAt: number;
  expiryEnforced: boolean;
  url: string;
}

export interface SignerSettings {
  cloudName: string;
  secureDistribution: string;
  signingKey: string;
}

export function createRestrictedSigner(settings: SignerSettings) {
  const cloudName = typeof settings?.cloudName === 'string' ? settings.cloudName.trim() : '';
  const secureDistribution = typeof settings?.secureDistribution === 'string' ? settings.secureDistribution.trim() : '';
  const signingKey = typeof settings?.signingKey === 'string' ? settings.signingKey.trim() : '';
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(cloudName)) throw new Error('Restricted delivery needs a valid cloud name.');
  if (!/^[A-Za-z0-9.-]{1,253}$/.test(secureDistribution)) throw new Error('Restricted delivery needs a delivery domain.');
  if (!/^[0-9a-fA-F]{32,128}$/.test(signingKey)) throw new Error('Restricted delivery needs a hex token key.');

  // Passed per call on purpose. Configuring the shared client would also rewrite the
  // public image URLs every other route builds.
  return function sign(record: PendingMediaRecord): SignedMediaLocation {
    const windowEndsAt = Math.floor(record.accessExpiresAt / 1000);
    const url = cloudinary.utils.url(record.providerPublicId, {
      cloud_name: cloudName,
      private_cdn: true,
      secure: true,
      secure_distribution: secureDistribution,
      resource_type: 'image',
      type: 'authenticated',
      auth_token: { key: signingKey, expiration: windowEndsAt },
    });
    return Object.freeze({
      assetId: record.assetId,
      version: record.version,
      expiresAt: windowEndsAt * 1000,
      expiryEnforced: true,
      url,
    });
  };
}
