import { v2 as cloudinary } from 'cloudinary';
import type { PendingMediaRecord } from './media-manifest';

// Build expiring authenticated delivery URLs without calling the network.
// The proxy re-checks identity, ownership and expiry before releasing bytes.

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
  signingMode?: string;
  apiKey?: string;
  apiSecret?: string;
}

export function createRestrictedSigner(settings: SignerSettings) {
  const cloudName = typeof settings?.cloudName === 'string' ? settings.cloudName.trim() : '';
  const secureDistribution = typeof settings?.secureDistribution === 'string' ? settings.secureDistribution.trim() : '';
  const signingKey = typeof settings?.signingKey === 'string' ? settings.signingKey.trim() : '';
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(cloudName)) throw new Error('Restricted delivery needs a valid cloud name.');
  if (!/^[A-Za-z0-9.-]{1,253}$/.test(secureDistribution)) throw new Error('Restricted delivery needs a delivery domain.');
  const signingMode = settings.signingMode || 'token';
  if (!['token', 'private-download'].includes(signingMode)) throw new Error('Unsupported restricted signing mode.');
  if (signingMode === 'token' && !/^[0-9a-fA-F]{32,128}$/.test(signingKey)) throw new Error('Restricted delivery needs a hex token key.');
  if (signingMode === 'private-download' && (secureDistribution !== 'api.cloudinary.com' || !settings.apiKey?.trim() || !settings.apiSecret?.trim())) throw new Error('Private download needs the exact API origin and credentials.');

  // Passed per call on purpose. Configuring the shared client would also rewrite the
  // public image URLs every other route builds.
  return function sign(record: PendingMediaRecord): SignedMediaLocation {
    const windowEndsAt = Math.floor(record.accessExpiresAt / 1000);
    if (signingMode === 'private-download') {
      // Only new, server-normalized JPEG records use this mode. Legacy formats stay closed.
      if (!/^styld\/[A-Za-z0-9_/-]+\/[a-f0-9-]{36}_styld_jpeg$/.test(record.providerPublicId)) throw new Error('Unknown private image format.');
      const downloadOptions = {
        cloud_name: cloudName, api_key: settings.apiKey, api_secret: settings.apiSecret,
        resource_type: 'image', type: 'authenticated', attachment: false, expires_at: windowEndsAt,
      } as const;
      const url = cloudinary.utils.private_download_url(record.providerPublicId, 'jpg', downloadOptions);
      const parsed = new URL(url);
      if (parsed.origin !== 'https://api.cloudinary.com' || parsed.pathname !== '/v1_1/' + cloudName + '/image/download' || parsed.username || parsed.password || parsed.hash) throw new Error('Unexpected private download location.');
      return Object.freeze({ assetId: record.assetId, version: record.version, expiresAt: windowEndsAt * 1000, expiryEnforced: true, url });
    }
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
