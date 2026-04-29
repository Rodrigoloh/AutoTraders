import { supabase } from './supabaseClient';

function normalizeFileName(fileName) {
  return fileName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '');
}

export async function uploadInventoryImages(loteId, files) {
  const uploadResults = [];

  for (const file of files) {
    const path = `${loteId}/${crypto.randomUUID()}-${normalizeFileName(file.name)}`;
    const { data, error } = await supabase.storage.from('autos').upload(path, file, {
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data: publicUrl } = supabase.storage.from('autos').getPublicUrl(data.path);

    uploadResults.push(publicUrl.publicUrl);
  }

  return uploadResults;
}
