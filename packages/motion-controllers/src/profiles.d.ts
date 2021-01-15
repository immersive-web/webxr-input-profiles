export as namespace Profiles;

export async function fetchProfilesList(basePath: string): Promise<{ [key: string]: string }>;
export async function fetchProfile(
  xrInputSource: object,
  basePath: string,
  defaultProfileId?: string,
  getAssetPath?: boolean
): Promise<{ profile: object; assetPath?: string }>;
