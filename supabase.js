(function (global, factory) {
    global.supabase = factory();
})(this, (function () { 'use strict';
    class SupabaseClient {
        constructor(supabaseUrl, supabaseKey) {
            this.supabaseUrl = supabaseUrl.replace(/\/$/, "");
            this.supabaseKey = supabaseKey;
            
            // Módulo de Autenticación Profesional integrado
            this.auth = {
                signInWithPassword: async ({ email, password }) => {
                    const url = `${this.supabaseUrl}/auth/v1/token?grant_type=password`;
                    console.log("🔒 [SUPABASE AUTH] Intentando inicio de sesión en la nube...");
                    try {
                        const res = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'apikey': this.supabaseKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ email, password })
                        });
                        const data = await res.json();
                        if (!res.ok) return { data: null, error: data };
                        
                        // Guardar sesión en memoria del cliente
                        return { data: { user: data.user, session: data }, error: null };
                    } catch (err) {
                        return { data: null, error: err };
                    }
                }
            };
        }
        from(table) {
            return {
                select: (columns) => {
                    const req = this._request('GET', table, columns);
                    return { order: (col, opts) => req };
                },
                insert: (values) => this._request('POST', table, values),
                update: (values) => {
                    return { eq: (colName, colVal) => this._request('PATCH', `${table}?${colName}=eq.${colVal}`, values) };
                },
                delete: () => {
                    return { eq: (colName, colVal) => this._request('DELETE', `${table}?${colName}=eq.${colVal}`, null) };
                }
            };
        }
        _request(method, table, payload) {
            const url = `${this.supabaseUrl}/rest/v1/${table}`;
            console.log(`🌐 [SUPABASE HTTP] ${method} -> ${url}`);
            
            const options = {
                method: method,
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            };
            
            if (method !== 'GET' && payload) {
                options.body = JSON.stringify(payload);
            }
            
            return fetch(url, options).then(res => {
                if (res.status === 204) return { data: [], error: null };
                return res.text().then(text => {
                    const data = text ? JSON.parse(text) : [];
                    return { data: res.ok ? data : null, error: res.ok ? null : data };
                });
            }).catch(err => {
                console.error("Fallo de red en Fetch:", err);
                return { data: null, error: err };
            });
        }
    }
    return { createClient: (url, key) => new SupabaseClient(url, key) };
}));
