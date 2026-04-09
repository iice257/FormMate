// @ts-nocheck
export class SupabaseStorageProvider {
  constructor({ supabaseUrl, supabaseAnonKey, table = 'formmate_user_data', getAccessToken = null }) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.table = table;
    this.getAccessToken = typeof getAccessToken === 'function' ? getAccessToken : null;
  }

  async getHeaders(contentType = false) {
    const accessToken = await Promise.resolve(this.getAccessToken ? this.getAccessToken() : null).catch(() => null);
    const bearer = String(accessToken || this.supabaseAnonKey || '').trim();
    const headers = {
      apikey: this.supabaseAnonKey,
      Authorization: `Bearer ${bearer}`,
      Accept: 'application/json',
    };

    if (contentType) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  async getUserData(userId) {
    const url = new URL(`${this.supabaseUrl.replace(/\/+$/, '')}/rest/v1/${encodeURIComponent(this.table)}`);
    url.searchParams.set('select', 'profile,settings,vault,form_history');
    url.searchParams.set('user_id', `eq.${userId}`);

    const res = await fetch(url.toString(), {
      headers: await this.getHeaders()
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`[SupabaseStorageProvider] getUserData failed (${res.status}): ${body}`);
    }

    const rows = await res.json();
    const data = Array.isArray(rows) ? rows[0] : null;
    if (!data) return null;

    return {
      profile: data.profile || null,
      settings: data.settings || null,
      vault: data.vault || null,
      formHistory: Array.isArray(data.form_history) ? data.form_history : (data.form_history || null),
    };
  }

  async upsertUserData(userId, patch) {
    const record = {
      user_id: userId,
      updated_at: new Date().toISOString(),
      ...patch,
    };

    const url = `${this.supabaseUrl.replace(/\/+$/, '')}/rest/v1/${encodeURIComponent(this.table)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...(await this.getHeaders(true)), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`[SupabaseStorageProvider] upsertUserData failed (${res.status}): ${body}`);
    }
  }

  async deleteUserData(userId) {
    const url = new URL(`${this.supabaseUrl.replace(/\/+$/, '')}/rest/v1/${encodeURIComponent(this.table)}`);
    url.searchParams.set('user_id', `eq.${userId}`);

    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`[SupabaseStorageProvider] deleteUserData failed (${res.status}): ${body}`);
    }
  }
}
